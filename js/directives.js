(function(){
    angular.module('pineapple')
    .directive('hookModal', function(){
        return {
            restrict: 'E',
            templateUrl: '/html/hook-modal.html',
            scope: {
                hook: '=hook',
                content: '=content',
                deauth: '=deauth',
                client: '=client',
                show_probes: '=probes'
            },
            controller: ['$scope', '$api', '$timeout', '$http', '$interval', function($scope, $api, $timeout, $http, $interval){
                $scope.error = '';
                $scope.success = false;
                $scope.pineAPStarting = false;
                $scope.probes = "";
                $scope.oui = null;
                $scope.ouiLoading = false;
                $scope.gettingOUI = false;
                $scope.noteData = {
                    name: "",
                    note: ""
                };
                $scope.noteSaved = false;

                $scope.handleResponse = function(response){
                    if (response.error === undefined) {
                        $scope.success = true;
                        $timeout(function() {
                            $scope.success = false;
                        }, 2000);
                    } else {
                        $scope.error = response.error;
                    }
                };

                $scope.locallyAssignedMac = function() {
                  return locallyAssigned($scope.content);
                };

                $scope.destroyModal = function(){
                    $('#pineap-hook').modal('hide').detach();
                };

                $scope.startPineAP = function(){
                    $scope.pineAPStarting = true;
                    $api.request({
                        module: 'PineAP',
                        action: 'enable'
                    }, function(response){
                        $scope.error = response.error;
                        $scope.pineAPStarting = false;
                    });
                };
                $scope.addSSIDToPool = function(){
                    $api.request({
                        module: 'PineAP',
                        action: 'addSSID',
                        ssid: $scope.content
                    }, $scope.handleResponse);
                };
                $scope.removeSSIDFromPool = function(){
                    $api.request({
                        module: 'PineAP',
                        action: 'removeSSID',
                        ssid: $scope.content
                    }, $scope.handleResponse);
                };
                $scope.addSSIDToFilter = function(){
                    $api.request({
                        module: 'Filters',
                        action: 'addSSID',
                        ssid: $scope.content
                    }, $scope.handleResponse);
                };
                $scope.removeSSIDFromFilter = function(){
                    $api.request({
                        module: 'Filters',
                        action: 'removeSSID',
                        ssid: $scope.content
                    }, $scope.handleResponse);
                };
                $scope.deauthAP = function(){
                    var deauthMultiplier = $('#deauthMultiply').val().replace(/[^0-9]/g, "");
                    $api.request({
                        module: 'PineAP',
                        action: 'deauth',
                        sta: $scope.deauth.bssid,
                        clients: $scope.deauth.clients,
                        channel: $scope.deauth.channel,
                        multiplier: deauthMultiplier
                    }, $scope.handleResponse);
                };
                $scope.addMACToFilter = function(){
                    $api.request({
                        module: 'Filters',
                        action: 'addClient',
                        mac: $scope.content
                    }, $scope.handleResponse);
                };
                $scope.removeMacFromFilter = function(){
                    $api.request({
                        module: 'Filters',
                        action: 'removeClient',
                        mac: $scope.content
                    }, $scope.handleResponse);
                };
                $scope.addClientsToFilter = function() {
                    $api.request({
                        module: 'Filters',
                        action: 'addClients',
                        clients: $scope.deauth.clients
                    }, $scope.handleResponse);
                };
                $scope.addMacToTracking = function(){
                    $api.request({
                        module: 'Tracking',
                        action: 'addMac',
                        mac: $scope.content
                    }, $scope.handleResponse);
                };
                $scope.removeMacFromTracking = function(){
                    $api.request({
                        module: 'Tracking',
                        action: 'removeMac',
                        mac: $scope.content
                    }, $scope.handleResponse);
                };
                $scope.deauthClient = function(){
                    var deauthMultiplier = $('#deauthMultiply').val().replace(/[^0-9]/g, "");
                    $api.request({
                        module: 'PineAP',
                        action: 'deauth',
                        sta: $scope.deauth.bssid,
                        clients: [$scope.content],
                        channel: $scope.deauth.channel,
                        multiplier: deauthMultiplier
                    }, $scope.handleResponse);
                };
                $scope.loadProbes = function(){
                    $api.request({
                        module: 'PineAP',
                        action: 'loadProbes',
                        mac: $scope.content
                    }, function(response) {
                        $scope.probes = response.probes;
                        $scope.probeError = $scope.probes === "";
                    });
                };
                $scope.addProbes = function(){
                    $api.request({
                        module: 'PineAP',
                        action: 'addSSIDs',
                        ssids: $scope.probes.split("\n")
                    }, function(response) {
                        $scope.probesAdded = response.success;
                    });
                };

                $scope.loadOUIFile = (function() {
                    if (typeof(Storage) === "undefined") {
                        return false;
                    }
                    var ouiText = localStorage.getItem("ouiText");
                    if (ouiText === null) {
                            $scope.gettingOUI = true;
                            $http.get('https://www.wifipineapple.com/oui.txt').then(
                            function(response) {
                                localStorage.setItem("ouiText", response.data);
                                $scope.populateDB();
                            },
                            function() {
                                $api.request({
                                    module: "Networking",
                                    action: "getOUI"
                                }, function(response) {
                                    if (response.error === undefined) {
                                        localStorage.setItem("ouiText", response.ouiText);
                                        $scope.populateDB();
                                    } else {
                                        return false;
                                    }
                                });
                            });
                    }
                    return true;
                });

                $scope.lookupOUI = function() {
                    $scope.ouiLoading = true;
                    if (!$scope.ouiPresent()) {
                        return;
                    }

                    var request = window.indexedDB.open("pineapple", 1);
                    request.onsuccess = function() {
                        var db = request.result;
                        var prefix = $scope.content.substring(0,8).replace(/:/g,'');
                        var transaction = db.transaction("oui");
                        var objectStore = transaction.objectStore("oui");
                        var lookupReq = objectStore.get(prefix);
                        lookupReq.onerror = function() {
                            window.indexedDB.deleteDatabase("pineapple");
                            $scope.oui = "Error retrieving OUI";
                        };
                        lookupReq.onsuccess = function() {
                            if (lookupReq.result) {
                                $scope.oui = lookupReq.result.name;
                            } else {
                                $scope.oui = "Unknown MAC prefix";
                            }
                        };
                        $scope.ouiLoading = false;
                    }
                };

                $scope.ouiPresent = function() {
                    return localStorage.getItem("ouiText") !== null;
                };

                $scope.populateDB = function() {
                    $scope.ouiLoading = true;
                    var request = window.indexedDB.open("pineapple", 1);

                    request.onsuccess = function() {
                        $scope.lookupOUI();
                    };

                    request.onerror = function(event) {};

                    request.onupgradeneeded = function(event) {
                        var db = event.target.result;
                        var objectStore = db.createObjectStore("oui", { keyPath: "macPrefix"});
                        var text = localStorage.getItem("ouiText");
                        var pos = 0;
                        do {
                            var line = text.substring(pos, text.indexOf("\n", pos + 1)).replace('\n', '');
                            var arr = [line.substring(0, 6), line.substring(6)];
                            objectStore.add({
                                macPrefix: arr[0],
                                name: arr[1]
                            });
                            pos += line.length + 1;
                        } while (text.indexOf("\n", pos + 1) !== -1);
                    };
                };
                $scope.deleteOUI = function() {
                    localStorage.removeItem('ouiText');
                    window.indexedDB.deleteDatabase('pineapple').onsuccess = function() {
                        $scope.success = true;
                        $scope.ouiLoading = false;
                        $scope.gettingOUI = false;
                        $timeout(function() {
                            $scope.success = false;
                        }, 2000);
                    };
                };
                $scope.getNoteData = function() {
                    $api.request({
                        module: "Notes",
                        action: "getNote",
                        key: $scope.content
                    }, function(response) {
                        if (response.note !== null && response.note[0] !== undefined) {
                            $scope.noteData = response.note[0];
                        }
                    });
                };
                $scope.setNoteData = function() {
                    $api.request({
                        module: "Notes",
                        action: "setNote",
                        type: $scope.hook === "mac" ?  0 : 1,
                        key: $scope.content,
                        name: $scope.noteData.name,
                        note: $scope.noteData.note
                    }, function() {
                        $scope.getNoteData();
                        $scope.noteSaved = true;
                    });
                };
                $scope.lookupOUI();
                $scope.getNoteData();
            }]
        };
    })
    .directive('hookButton', function(){
        return {
            restrict: 'E',
            template: '<button ng-disabled="disable" ng-click="showModal($event)" class="btn btn-xs btn-default" type="button"><span class="caret"></span></button>',
            scope: {
                hook: '@hook',
                content: '=content',
                deauth: '=deauth',
                client: '=client',
                show_probes: '=probes',
                disable: '=disable'
            },
            controller: ['$scope', '$compile', function($scope, $compile){
                $scope.makeModalWithContent = function(){

                    var html = '<hook-modal hook="hook" content="content"';
                    if ($scope.deauth !== undefined) {
                        html += ' deauth="deauth"';
                    }
                    if ($scope.show_probes !== undefined) {
                        html += ' probes="true"';
                    }
                    html += '></hook-modal>';
                    var el = $compile(html)($scope);
                    $('body').append(el);
                    $('#pineap-hook').modal({
                        show: true,
                        keyboard: false,
                        backdrop: 'static'
                    });
                };
                $scope.showModal = function(){
                    $('#pineap-hook').remove();
                    $scope.makeModalWithContent();
                };
            }]
            };
        })
        .directive('cloneModal', function(){
            return {
                restrict: 'E',
                templateUrl: '/html/clone-modal.html',
                scope: {
                    hook: '=hook',
                    content: '=content',
                    disable: '=disable'
                },
                controller: ['$scope', '$api', '$timeout', '$http', '$interval', function($scope, $api, $timeout, $http, $interval){
                    $scope.error = '';
                    $scope.working = false;
                    $scope.success = false;
                    $scope.oui = null;
                    $scope.ouiLoading = false;
                    $scope.gettingOUI = false;

                    $scope.handleResponse = function(response){
                        if (response.error === undefined) {
                            $scope.success = true;
                            $timeout(function() {
                                $scope.success = false;
                            }, 2000);
                        } else {
                            $scope.error = response.error;
                        }
                    };
                    $scope.cloneEnterpriseAP = function(){
                        $scope.working = true;

                        x = '0x' + $scope.content.bssid.slice(-2);
                        if (x === '0xFF')
                            x = '0x00';
                        newOctet = (parseInt(x, 16) + 0x1).toString(16);
                        if (x.charAt(2) === '0')
                            newOctet = ['0', newOctet.slice(0)].join('');
                        newMac = $scope.content.bssid.slice(0, -2) + newOctet;

                        let settings = {
                            enabled: false,
                            enableAssociations: false,
                            ssid: $scope.content.ssid,
                            mac: newMac,
                            encryptionType: $scope.encryptionTranslate($scope.content.encryption)
                        };
                        $api.request({
                            module: 'PineAP',
                            action: 'setEnterpriseSettings',
                            settings: settings
                        }, function(response) {
                            if (response.success === true) {
                                $scope.success = true;
                                $scope.working = false;
                                $timeout(function(){
                                    $scope.success = false;
                                }, 2000);
                            }
                        });
                    };

                    $scope.encryptionTranslate = function(uiVal) {
                        let lookup = {
                            "WPA2 Enterprise (CCMP)": "wpa2+ccmp",
                            "WPA2 Enterprise (TKIP)": "wpa2+tkip",
                            "WPA2 Enterprise (TKIP CCMP)": "wpa2+ccmp+tkip",
                            "WPA Enterprise (CCMP)": "wpa+ccmp",
                            "WPA Enterprise (TKIP)": "wpa+tkip",
                            "WPA Enterprise (CCMP TKIP)": "wpa+ccmp+tkip",
                            "WPA Mixed Enterprise (CCMP)": "wpa-mixed+ccmp",
                            "WPA Mixed Enterprise (TKIP)": "wpa-mixed+tkip",
                            "WPA Mixed Enterprise (CCMP TKIP)": "wpa-mixed+ccmp+tkip"
                        };
                        return lookup[uiVal];
                    };

                    $scope.loadOUIFile = (function() {
                        if (typeof(Storage) === "undefined") {
                            return false;
                        }
                        var ouiText = localStorage.getItem("ouiText");
                        if (ouiText === null) {
                            $scope.gettingOUI = true;
                            $http.get('https://www.wifipineapple.com/oui.txt').then(
                                function(response) {
                                    localStorage.setItem("ouiText", response.data);
                                    $scope.populateDB();
                                },
                                function() {
                                    $api.request({
                                        module: "Networking",
                                        action: "getOUI"
                                    }, function(response) {
                                        if (response.error === undefined) {
                                            localStorage.setItem("ouiText", response.ouiText);
                                            $scope.populateDB();
                                        } else {
                                            return false;
                                        }
                                    });
                                });
                        }
                        return true;
                    });

                    $scope.lookupOUI = function() {
                        $scope.ouiLoading = true;
                        if (!$scope.ouiPresent()) {
                            return;
                        }

                        var request = window.indexedDB.open("pineapple", 1);
                        request.onsuccess = function() {
                            var db = request.result;
                            var prefix = $scope.content.bssid.substring(0,8).replace(/:/g,'');
                            var transaction = db.transaction("oui");
                            var objectStore = transaction.objectStore("oui");
                            var lookupReq = objectStore.get(prefix);
                            lookupReq.onerror = function() {
                                window.indexedDB.deleteDatabase("pineapple");
                                $scope.oui = "Error retrieving OUI";
                            };
                            lookupReq.onsuccess = function() {
                                if (lookupReq.result) {
                                    $scope.oui = lookupReq.result.name;
                                } else {
                                    $scope.oui = "Unknown MAC prefix";
                                }
                            };
                            $scope.ouiLoading = false;
                        }
                    };

                    $scope.ouiPresent = function() {
                        return localStorage.getItem("ouiText") !== null;
                    };

                    $scope.populateDB = function() {
                        $scope.ouiLoading = true;
                        var request = window.indexedDB.open("pineapple", 1);

                        request.onsuccess = function() {
                            $scope.lookupOUI();
                        };

                        request.onerror = function(event) {
                        };

                        request.onupgradeneeded = function(event) {
                            var db = event.target.result;
                            var objectStore = db.createObjectStore("oui", { keyPath: "macPrefix"});
                            var text = localStorage.getItem("ouiText");
                            var pos = 0;
                            do {
                                var line = text.substring(pos, text.indexOf("\n", pos + 1)).replace('\n', '');
                                var arr = [line.substring(0, 6), line.substring(6)];
                                objectStore.add({
                                    macPrefix: arr[0],
                                    name: arr[1]
                                });
                                pos += line.length + 1;
                            } while (text.indexOf("\n", pos + 1) !== -1);
                        };
                    };
                    $scope.deleteOUI = function() {
                        localStorage.removeItem('ouiText');
                        window.indexedDB.deleteDatabase('pineapple').onsuccess = function() {
                            $scope.success = true;
                            $scope.ouiLoading = false;
                            $scope.gettingOUI = false;
                            $timeout(function() {
                                $scope.success = false;
                            }, 2000);
                        };
                    };

                    $scope.lookupOUI();
                    $scope.destroyModal = function(){
                        $('#clone-hook').modal('hide').detach();
                    };
                }]
            };
        })
        .directive('cloneButton', function(){
            return {
                restrict: 'E',
                template: '<button ng-disabled="disable" ng-click="showModal($event)" class="btn btn-xs btn-default" type="button"><span class="caret"></span></button>',
                scope: {
                    hook: '@hook',
                    content: '=content',
                    disable: '=disable'
                },
                controller: ['$scope', '$compile', function($scope, $compile){
                    $scope.makeModalWithContent = function(){
                        var html = '<clone-modal hook="hook" content="content"';
                        html += '></clone-modal>';
                        var el = $compile(html)($scope);
                        $('body').append(el);
                        $('#clone-hook').modal({
                            show: true,
                            keyboard: false,
                            backdrop: 'static'
                        });
                    };
                    $scope.showModal = function($event){
                        $('#clone-hook').remove();
                        $scope.makeModalWithContent();
                    };
                }]
            };
        })
})();
