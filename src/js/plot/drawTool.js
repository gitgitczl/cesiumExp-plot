
import CreateBillboard from './createBillboard.js'
import CreateCircle from './createCircle.js'
import CreateGltfModel from './createGltfModel.js'
import CreateLabel from './createLabel.js'
import CreatePoint from './createPoint.js'
import CreatePolygon from './createPolygon.js'
import CreateRectangle from './createRectangle'
import CreatePolyline from './createPolyline.js'
/* import CreateArrow from "./createArrow"; */ // 军事标绘
import util from '../util.js'
/**
 * 绘制控制类
 * 
 * @class
 * @example
 * let drawTool = new easy3d.DrawTool(window.viewer, {
    canEdit: true,
  });
  plotDrawTool.on("endCreate", function (entObj, ent) {});
  plotDrawTool.start({
      "name": "面",
      "type": "polygon",
      "style": {
          "color": "#0000ff",
          "outline": true,
          "outlineColor": "#ff0000",
          "heightReference": 1
      }
  })
 */
class DrawTool {
  /**
   * 
   * @param {Cesium.viewer} viewer 地图viewer对象 
   * @param {Object} obj 相关属性配置
   * @param {Boolean} obj.canEdit 是否可编辑
   */
  constructor(viewer, obj) {
    if (!viewer) {
      console.warn("缺少必要参数！--viewer");
      return;
    }
    obj = obj || {};
    this.viewer = viewer;
    /**
     * 
     * @property {Array} entityObjArr 标绘对象数组
     */
    this.entityObjArr = [];
    this.handler = null;
    this.removeHandler = new Cesium.ScreenSpaceEventHandler(
      this.viewer.scene.canvas
    );
    /* this.show = obj.drawEndShow == undefined ? true : obj.drawEndShow; */

    /**
     * @property {Object} nowEditEntityObj 当前编辑对象
     */
    this.startEditFun = null;
    this.endEditFun = null;
    this.removeFun = null;
    this.editingFun = undefined;

    this.deleteEntityObj = null;

    // 无论如何 进来先监听点击修改 与 右键删除事件 通过控制canEdit来判断要不要向下执行
    this.bindEdit();
    this.bindRemove();

    /**
     * @property {Boolear} canEdit 绘制的对象，是否可编辑
     */
    this.canEdit = obj.canEdit == undefined ? true : obj.canEdit;; // 是否可以编辑

    /**
     * @property {Boolear} fireEdit 绘制的对象，是否直接进入编辑状态（需要canEdit==true）
     */
    this.fireEdit = obj.fireEdit == undefined ? true : obj.fireEdit;;

    this.nowDrawEntityObj = null; // 当前绘制的对象
    this.nowEditEntityObj = null; // 当前编辑的对象
  }

  /** 
   * 事件绑定
   * @param {String} type 事件类型（startEdit 开始编辑时 / endEdit 编辑结束时 / remove 删除对象时 / endCreate 创建完成后）
   * @param {Function} fun 绑定函数
  */
  on(type, fun) {
    if (type == "startEdit") {
      // 开始编辑事件
      this.startEditFun = fun;
    }
    if (type == "endEdit") {
      // 结束编辑事件
      this.endEditFun = fun;
    }
    if (type == "remove") {
      // 移除事件
      this.removeFun = fun;
    }
    if (type == "endCreate") {
      // 绘制完成事件
      this.endCreateFun = fun;
    }
    if (type == "editing") {
      // 正在编辑
      this.editingFun = fun;
    }
  }

  /**
   * 开启编辑功能
   */
  openEdit() {
    this.canEdit = true;
  }

  /**
  * 关闭编辑功能
  */
  closeEdit() {
    this.endEdit();
    this.canEdit = false;
  }

  /**
   * 开始绘制
   * @param {Object} opt 相关属性
   * @param {String} opt.type 绘制类型 polyline、polygon、billboard、circle、rectangle、gltfModel、point、label、arrow
   * @param {Object} opt.style 当前绘制对象的样式配置，具体配置见{@link style};
   * @returns {Object} entityObj 当前绘制对象
   */
  start(opt) {
    if (!opt || !opt.type) {
      return;
    }
    opt.id = opt.id || Number((new Date()).getTime() + "" + Number(Math.random() * 1000).toFixed(0));
    let that = this;
    this.endEdit(); // 绘制前  结束编辑

    if (this.nowDrawEntityObj && (
      this.nowDrawEntityObj.state == "startCreate" ||
      this.nowDrawEntityObj.state == "creating")) { // 禁止一次绘制多个
      this.nowDrawEntityObj.destroy();
      this.nowDrawEntityObj = null;
    }
    let entityObj = this.createByType(opt);
    if (!entityObj) return;
    entityObj.attr = opt || {}; // 保存开始绘制时的属性

    // 开始绘制
    entityObj.start(function (entity) {
      // 绘制完成后
      that.nowDrawEntityObj = undefined;
      that.entityObjArr.push(entityObj);
      // endCreateFun 和 success 无本质区别，若构建时 两个都设置了 当心重复
      if (opt.success) opt.success(entityObj, entity);
      if (that.endCreateFun) that.endCreateFun(entityObj, entity);

      if (opt.show == false) entityObj.setVisible(false);

      // 如果可以编辑 则绘制完成打开编辑
      if (that.canEdit && that.fireEdit) {
        entityObj.startEdit(function () {
          if (that.editingFun) that.editingFun(entityObj, entityObj.entity);
        });
        that.nowEditEntityObj = entityObj;
        if (that.startEditFun) that.startEditFun(entityObj, entity);
      }
    });

    this.nowDrawEntityObj = entityObj;
    return entityObj;
  }

  /**
   * 结束当前操作
  */
  end() {
    if (this.nowDrawEntityObj) {

    }
  }

  /**
  * 开始编辑绘制对象
  * @param {Object} entityObj 绘制的对象
 */
  startEditOne(entityObj) {
    if (!this.canEdit) return;
    if (this.nowEditEntityObj) {
      // 结束除当前选中实体的所有编辑操作
      this.nowEditEntityObj.endEdit();
      if (this.endEditFun) {
        this.endEditFun(this.nowEditEntityObj, this.nowEditEntityObj.getEntity()); // 结束事件
      }
      this.nowEditEntityObj = null;
    }
    let that = this;
    if (entityObj) {
      entityObj.startEdit(function () {
        if (that.editingFun) that.editingFun(entityObj, entityObj.entity);
      });
      if (this.startEditFun)
        this.startEditFun(entityObj, entityObj.getEntity());
      this.nowEditEntityObj = entityObj;
    }
  }

  /**
   * 修改绘制对象的样式
   * @param {Object} entityObj 绘制的对象
   * @param {Object} style 样式
  */
  updateOneStyle(entityObj, style) {
    if (entityObj) {
      entityObj.setStyle(style);
    }
  }

  /**
   * 根据坐标构建绘制对象
   * @param {Object} opt 绘制的对象
   * @param {Cesium.Cartesian3[] | Array} opt.positions 坐标数组
   * @param {Object} opt.style 当前绘制对象的样式配置，具体配置见{@link style};
   * @param {Funtion} opt.success 创建完成的回调函数
   * @param {Boolean} [opt.show] 创建完成后，是否展示
  */
  createByPositions(opt) {
    opt = opt || {};
    if (!opt) opt = {};
    if (!opt.positions) return;
    opt.id = opt.id || Number((new Date()).getTime() + "" + Number(Math.random() * 1000).toFixed(0));
    let that = this;
    let entityObj = this.createByType(opt);
    if (!entityObj) return;
    entityObj.attr = opt; // 保存开始绘制时的属性
    entityObj.createByPositions(opt.positions, function (entity) {
      that.entityObjArr.push(entityObj);
      entityObj.setStyle(opt.style); // 设置相关样式
      // endCreateFun 和 success 无本质区别，若构建时 两个都设置了 当心重复
      if (opt.success) opt.success(entityObj, entity);
      if (that.endCreateFun) that.endCreateFun(entityObj, entity);
      if (opt.show == false) entityObj.setVisible(false);
      // 如果可以编辑 则绘制完成打开编辑 
      if (that.canEdit && that.fireEdit) {
        entityObj.startEdit(function () {
          if (that.editingFun) that.editingFun(entityObj, entityObj.entity);
        });
        if (that.startEditFun) that.startEditFun(entityObj, entity);
        that.nowEditEntityObj = entityObj;
      }
    });
    return entityObj;
  }

  /**
   * 由geojson格式数据创建对象
   * @param {Object} data geojson格式数据
  */
  createByGeojson(data) {
    let { features } = data;
    let entObjArr = [];
    for (let i = 0; i < features.length; i++) {
      let feature = features[i];
      const { properties, geometry } = feature;
      let plotType = properties.plotType;
      const geoType = geometry.type;
      const coordinates = geometry.coordinates;
      let positions = [];
      let drawType = "";
      switch (geoType) {
        case "LineString":
          positions = util.lnglatsToCartesians(coordinates);
          drawType = "polyline";
          break;
        case "Polygon":
          positions = util.lnglatsToCartesians(coordinates[0]);
          drawType = "polygon";
          break;
        case "Point":
          positions = util.lnglatsToCartesians([coordinates])[0];
          drawType = plotType;
          break;
        default: ;
      }
      this.fireEdit = false;
      let entObj = this.createByPositions({
        type: drawType,
        styleType: plotType,
        positions: positions,
        style: properties.style
      })
      if (entObj) entObjArr.push(entObj);
    }
    return entObjArr;
  }

  /**
   * 转为geojson格式
   * @returns {Object} featureCollection geojson格式数据
   */
  toGeojson() {
    let featureCollection = {
      type: "FeatureCollection",
      features: [],
    };
    if (this.entityObjArr.length == 0) return null;
    for (let i = 0; i < this.entityObjArr.length; i++) {
      let item = this.entityObjArr[i];
      let lnglats = item.getPositions(true);
      // geojson中 单个坐标 不含高度 否则geojsondatasourece加载会有问题
      let coordinates = [];
      for (let step = 0; step < lnglats.length; step++) {
        coordinates.push([lnglats[step][0], lnglats[step][1]])
      }
      let style = item.getStyle();
      let geoType = this.transType(item.type);
      let feature = {
        "type": "Feature",
        "properties": {
          "plotType": item.type,
          "style": style,
        },
        "geometry": {
          "type": geoType,
          "coordinates": []
        }
      }
      switch (geoType) {
        case "Polygon":
          feature.geometry.coordinates = [coordinates];
          break;
        case "Point":
          feature.geometry.coordinates = coordinates;
          break;
        case "LineString":
          feature.geometry.coordinates = coordinates;
          break;
        case "":

        default: ;
      }
      feature.properties = Object.assign(feature.properties, item.properties);
      featureCollection.features.push(feature);
    }
    return featureCollection;
  }

  // 标绘类型和geojson数据类型相互转换
  transType(plotType) {
    let geoType = '';
    switch (plotType) {
      case "polyline":
        geoType = "LineString";
        break;
      case "polygon":
        geoType = "Polygon";
        break;
      case "point":
      case "gltfModel":
      case "label":
      case "billboard":
        geoType = "Point";
        break;
      default:
        geoType = plotType;
    }
    return geoType;
  }

  /**
   * 销毁
   */
  destroy() {
    // 取消当前绘制
    if (this.nowEditEntityObj) {
      this.nowEditEntityObj.destroy();
      this.nowEditEntityObj = null;
    }
    if (this.nowDrawEntityObj) {
      this.nowDrawEntityObj.destroy();
      this.nowDrawEntityObj = null;
    }

    for (let i = 0; i < this.entityObjArr.length; i++) {
      this.entityObjArr[i].destroy();
    }
    this.entityObjArr = [];
    this.nowEditEntityObj = null;

    if (this.handler) {
      this.handler.destroy();
      this.handler = null;
    }

    if (this.removeHandler) {
      this.removeHandler.destroy();
      this.removeHandler = null;
    }
  }

  /**
   * 移除某个绘制对象
   * @param {Object} entityObj 已绘制完成绘制对象
   */
  removeOne(entityObj) {
    if (!entityObj) return;
    if (!entityObj) return;
    if (entityObj.state != "endCreate" || entityObj.state != "endEdit") {
      entityObj.destroy();
    } else {
      this.removeByObjId(entityObj.objId);
    }

  }

  /**
   * 移除全部绘制对象
   */
  removeAll() {
    // 取消当前绘制
    if (this.nowDrawEntityObj) {
      this.nowDrawEntityObj.destroy();
      this.nowDrawEntityObj = null;
    }

    if (this.nowEditEntityObj) {
      this.nowEditEntityObj.destroy();
      this.nowEditEntityObj = null;
    }

    for (let i = 0; i < this.entityObjArr.length; i++) {
      let obj = this.entityObjArr[i];
      obj.destroy();
    }
    this.entityObjArr = [];
    this.nowEditEntityObj = null;
  }

  /**
  * 是否包含某个对象
  * @param {Object} entityObj 绘制对象
  */
  hasEntityObj(entityObj) {
    if (!entityObj) return false;
    let obj = this.getEntityObjByObjId(entityObj.objId);
    return obj != {} ? true : false;
  }

  /**
  * 根据id移除创建的对象
  * @param {String | Number} id 对象id
  */
  removeByObjId(id) {
    let obj = this.getEntityObjByObjId(id);
    this.entityObjArr.splice(obj.index, 1);
    // 触发on绑定的移除事件
    if (this.removeFun)
      this.removeFun(obj.entityObj, obj.entityObj.getEntity());
    if (obj.entityObj) {
      obj.entityObj.destroy();
    }
  }

  /**
  * 根据attr.id移除创建的对象
  * @param {String | Number} id 创建时的attr.id
  */
  removeById(id) {
    let obj = this.getEntityObjById(id);
    this.entityObjArr.splice(obj.index, 1);
    // 触发on绑定的移除事件
    if (this.removeFun)
      this.removeFun(obj.entityObj, obj.entityObj.getEntity());
    if (obj.entityObj) {
      obj.entityObj.destroy();
    }
  }


  /**
  * 根据id缩放至绘制的对象
  * @param {String} id 对象id
  */
  zoomToByObjId(id) {
    let obj = this.getEntityObjByObjId(id);
    if (obj.entityObj) {
      obj.entityObj.zoomTo();
    }
  }


  /**
   * 根据attr属性字段获取对象
   * @param {String} fieldName 属性字段名称
   * @param {String} [fieldValue] 属性值，若不填，则默认以id进行查询
   * @returns {Object} obj 对象在数组中位置以及对象
   */

  getEntityObjByField(fieldName, fieldValue) {
    let obj = {};
    if (!fieldValue) {
      // 如果缺少第二个参数 则默认以attr.id进行查询
      for (let i = 0; i < this.entityObjArr.length; i++) {
        let item = this.entityObjArr[i];
        if (item.attr.id == fieldName) {
          obj.entityObj = item;
          obj.index = i;
          break;
        }
      }
    } else {
      // 否则 以键值对的形式进行查询
      for (let ind = 0; ind < this.entityObjArr.length; ind++) {
        let item = this.entityObjArr[ind];
        if (item.attr[fieldName] == fieldValue) {
          obj.entityObj = item;
          obj.index = ind;
          break;
        }
      }
    }
    return obj;
  }

  /**
   * 根据id设置对象的显示隐藏
   * @param {String | Number} id 对象id
   * @param {Boolean} visible 是否展示
   */
  setVisible(id, visible) {
    let obj = this.getEntityObjByField("id", id);
    if (obj.entityObj) obj.entityObj.setVisible(visible);
  }

  /**
   * 根据id获取对象
   * @param {String | Number} id entityObj的objid
   * @returns {Object} obj 对象在数组中位置以及对象
   */
  getEntityObjByObjId(id) {
    if (!id) return;
    let obj = {};
    for (let i = 0; i < this.entityObjArr.length; i++) {
      let item = this.entityObjArr[i];
      if (item.objId == id) {
        obj.entityObj = item;
        obj.index = i;
        break;
      }
    }
    return obj;
  }

  /**
   * 根据id获取对象，同getEntityObjByField('id',idvalue);
   * @param {String | Number} id 创建时的attr中的id
   * @returns {Object} obj 对象在数组中位置以及对象
   */
  getEntityObjById(id) {
    if (!id) return;
    let obj = {};
    for (let i = 0; i < this.entityObjArr.length; i++) {
      let item = this.entityObjArr[i];
      if (item.attr.id == id) {
        obj.entityObj = item;
        obj.index = i;
        break;
      }
    }
    return obj;
  }


  // 绑定编辑
  bindEdit() {
    let that = this;
    // 如果是线 面 则需要先选中
    if (!this.handler) this.handler = new Cesium.ScreenSpaceEventHandler(this.viewer.scene.canvas);
    this.handler.setInputAction(function (evt) {
      if (!that.canEdit) return;
      // 若当前正在绘制 则无法进行编辑操作
      if (that.nowDrawEntityObj) return;
      let pick = that.viewer.scene.pick(evt.position);
      if (Cesium.defined(pick) && pick.id) { // 选中实体
        for (let i = 0; i < that.entityObjArr.length; i++) {
          if (
            pick.id.objId == that.entityObjArr[i].objId &&
            (that.entityObjArr[i].state != "startCreate" ||
              that.entityObjArr[i].state != "creating" ||
              that.entityObjArr[i].state != "endEdit")
          ) {
            // 结束上一个实体的编辑操作
            if (that.nowEditEntityObj) {
              that.nowEditEntityObj.endEdit();
              if (that.endEditFun) {
                that.endEditFun(
                  that.nowEditEntityObj,
                  that.nowEditEntityObj.getEntity()
                );
              }
              that.nowEditEntityObj = null;
            }
            // 开始当前实体的编辑
            that.entityObjArr[i].startEdit(function () {
              if (that.editingFun) that.editingFun(that.nowEditEntityObj, that.nowEditEntityObj.entity);
            });
            if (that.startEditFun) that.startEditFun(that.entityObjArr[i], pick.id); // 开始编辑
            that.nowEditEntityObj = that.entityObjArr[i];
            break;
          }
        }
      } else {  // 未选中实体 则结束全部绘制
        if (that.nowEditEntityObj) {
          that.nowEditEntityObj.endEdit();
          if (that.endEditFun) {
            that.endEditFun(
              that.nowEditEntityObj,
              that.nowEditEntityObj.getEntity()
            );
          }
          that.nowEditEntityObj = undefined;
        }
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
  }

  // 绑定右键删除
  bindRemove() {
    let that = this;
    // 如果是线 面 则需要先选中
    if (!this.handler) this.handler = new Cesium.ScreenSpaceEventHandler(this.viewer.scene.canvas);
    this.handler.setInputAction(function (evt) {
      if (!that.canEdit) return;
      // 若当前正在绘制 则无法进行删除
      if (that.nowDrawEntityObj) return;
      let pick = that.viewer.scene.pick(evt.position);
      if (!pick || !pick.id) return;
      /* let selectEntobj = undefined; */
      /* for (let i = 0; i < that.entityObjArr.length; i++) {
        if (pick.id.objId == that.entityObjArr[i].objId) {
          selectEntobj = that.entityObjArr[i];
          break;
        }
      } */

      that.createDelteDom(evt.position, pick.id.objId);

    }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);
  }

  createDelteDom(px, objId) {
    if (!objId) return;
    let deleteDom = window.document.createElement("span");
    deleteDom.style.background = "rgba(0,0,0,0.5)";
    deleteDom.style.position = "absolute";
    deleteDom.style.color = "white";
    deleteDom.style.left = (px.x + 10) + "px";
    deleteDom.style.top = (px.y + 10) + "px";
    deleteDom.style.padding = "4px";
    deleteDom.style.cursor = "pointer";
    deleteDom.id = "easy3d-plot-delete";
    deleteDom.setAttribute("objId", objId);
    deleteDom.innerHTML = `删除`;
    let mapDom = window.document.getElementById(this.viewer.container.id);
    mapDom.appendChild(deleteDom);

    const clsBtn = window.document.getElementById("easy3d-plot-delete");
    if (!clsBtn) return;
    let that = this;
    clsBtn.addEventListener("click", (e) => {
      let id = deleteDom.getAttribute("objId");
      that.removeByObjId(id);
    });
    document.addEventListener("click", function () {
      clsBtn.remove();
    });
  }

  /**
   * 结束编辑
   */
  endEdit() {
    if (this.nowEditEntityObj) {
      // 结束除当前选中实体的所有编辑操作
      this.nowEditEntityObj.endEdit();
      if (this.endEditFun) {
        this.endEditFun(
          this.nowEditEntityObj,
          this.nowEditEntityObj.getEntity()
        ); // 结束事件
      }
      this.nowEditEntityObj = null;
    }
    for (let i = 0; i < this.entityObjArr.length; i++) {
      this.entityObjArr[i].endEdit();
    }
  }

  done() {
    if (this.nowEditEntityObj) {
      this.nowEditEntityObj.done();
      if (this.endEditFun) this.endEditFun(this.nowEditEntityObj, this.nowEditEntityObj.getEntity());
      this.nowEditEntityObj = undefined;
    }

    if (this.nowDrawEntityObj) {
      this.nowDrawEntityObj.done();
      this.entityObjArr.push(this.nowDrawEntityObj);
      if (this.endCreateFun) this.endCreateFun(this.nowDrawEntityObj, this.nowDrawEntityObj.getEntity());
      this.nowDrawEntityObj = undefined;
    }
  }


  /**
   * 获取当前所有对象
   * @returns {Array} entityObjArr
   */
  getEntityObjArr() {
    return this.entityObjArr;
  }
  createByType(opt) {
    let entityObj = undefined;
    let name = "";
    opt = opt || {};
    if (opt.type == "polyline") {
      entityObj = new CreatePolyline(this.viewer, opt.style);
      name = "折线_";
    }

    if (opt.type == "polygon") {
      entityObj = new CreatePolygon(this.viewer, opt.style);
      name = "面_";
    }

    if (opt.type == "billboard") {
      entityObj = new CreateBillboard(this.viewer, opt.style);
      name = "图标_";
    }

    if (opt.type == "circle") {
      entityObj = new CreateCircle(this.viewer, opt.style);
      name = "圆_";
    }

    if (opt.type == "rectangle") {
      entityObj = new CreateRectangle(this.viewer, opt.style);
      name = "矩形_";
    }

    if (opt.type == "gltfModel") {
      entityObj = new CreateGltfModel(this.viewer, opt.style);
      name = "模型_";
    }

    if (opt.type == "point") {
      entityObj = new CreatePoint(this.viewer, opt.style);
      name = "点_";
    }
    if (opt.type == "label") {
      entityObj = new CreateLabel(this.viewer, opt.style);
      name = "文字_";
    }

    // ========== 以下为付费功能 ==============
    // if (opt.type == "arrow") {
    //   /**
    //   * situationType值及对应的类型：
    //   *  	1-攻击箭头 2-攻击箭头（平尾）3-攻击箭头（燕尾）4-闭合曲面 5-钳击箭头 
    //   * 		6-单尖直箭头 7-粗单尖直箭头(带燕尾) 8-集结地 9-弓形面 10-直箭头 
    //   * 		11-矩形旗 12-扇形 13-三角旗 14-矩形波浪旗 17-多边形 18-圆形
    //   */
    //   if (!opt.arrowType) {
    //     console.log("缺少军事标绘类型");
    //     return;
    //   }
    //   entityObj = new CreateArrow(this.viewer, opt.arrowType, opt.style);
    // }

    if (entityObj) entityObj.name = name + new Date().getTime();
    return entityObj;
  }
}

export default DrawTool;


