# wifipineapplecn
wifipineapple V2.2.0汉化版
### 目的
很多刚使用wifipineapple的同学对其英文界面会有些晦涩难懂的感觉，现对V2.2.0版本进行汉化，以便于帮个刚使用的同学更快的入门。

### 安装方法
1.下载本汉化文件到电脑桌面，终端SSH方式连接wifipingapple
```
ssh root@wifipineapple IP
```
2.登录后根目录下的"/pineapple"即为本次要替换的目录现将原文件夹在同目录下进行备份
```
mv pineapple pineapple1
```
3.将桌面上的汉化文件夹使用scp传到远端wifipineapple上
```
scp -r root@wifipineapple IP:/pineapple/ /Users/xxxxx/Desktop/wifipineapple汉化文件夹/
```

至此刷新WEB页面即可看到简体汉字页面。

## 后续计划
* 逐个汉化模块
