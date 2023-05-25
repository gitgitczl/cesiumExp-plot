# Cesium标绘插件
### [在线体验地址1（三维框架内）](http://mapgl.com/shareCode/#/PopupTooltip?downUrl=)
### [在线体验地址2](http://mapgl.com/shareCode/#/Plot?downUrl=)
gitee：https://gitee.com/caozl1132/CesiumExp-plot  
github：https://github.com/gitgitczl/CesiumExp-plot  

ps：如果可以的话，希望大家能给我个star，好让我有更新下去的动力；

***
实现原理：<br/>
- 其中实现动态绘制的原理主要是利用了callbackproperty（[property总结](https://zhuanlan.zhihu.com/p/50534090)），核心的难点是处理好标绘对象的状态管理，我在类中使用了一个state属性来进行了管理，用其控制何时开始绘制、何时结束绘制、何时开始编辑等。  
  此类库提供了多种方法，如转geojson、加载geojson等。
- 整个类库我分为了三个部分：basePlot（所有标绘的父类）、createxxx（单个标绘）、drawTool（我称之为标绘管理工具）。  
  假设我现在想绘制一个线对象，那么我有以下两种方式：  
  1. 通过引入单个createXXX.js，然后new此对象即可。
    ```
      import Polyline from "./js/plot/CreatePolyline.js";
      let line = new Polyline(viewer,{});
      line.start();
    ```
  2. 通过引入drawTool，然后new DrawTool ,然后调用其start方法，传入不同的参数（推荐此种方法，因为可以通过on进行状态监听）。
    ```
      import Tool from "./js/plot/drawTool.js"
      plotDrawTool = new Tool(viewer, {
        canEdit: true,
      });
      // 监听不同的状态：如开始标绘、标绘结束、开始编辑等
      plotDrawTool.on("endCreate", function (entObj, ent) {
          // 标绘结束时执行
          ......
      });
      plotDrawTool.start({
        "name": "线",
        "type": "polyline",
        "iconImg": "./easy3d/images/plot/polyline.png",
        "styleType": "polyline",
        "style": {
            "clampToGround": true,
            "color": "#ffff00"
        }
      });
    ```  
以上是此库一个大致的介绍，具体调用和开发请参考开发文档。
***
其它：     
qq群：606645466（GIS之家共享交流群）

[更多案例地址](http://mapgl.com/shareCode/)&nbsp;&nbsp;&nbsp; [更多免费数据](http://mapgl.com/shareData/)&nbsp;&nbsp;&nbsp; [开发文档说明](http://mapgl.com/3dapi/)   

[其它源码下载（标绘、量算、动态材质、漫游、地图分析等）](http://mapgl.com/introduce/)
