import '../prompt/prompt.css'
import Prompt from '../prompt/prompt.js'
import util from '../util.js'
import BasePlot from './basePlot';
/**
 * 圆标绘类
 * @class
 * @augments BasePlot
 * @alias BasePlot.CreateCircle
 */
class CreateCircle extends BasePlot {
  constructor(viewer, style) {
    super(viewer, style);
    this.type = "circle";
    this.objId = Number(
      new Date().getTime() + "" + Number(Math.random() * 1000).toFixed(0)
    );
    this.viewer = viewer;
    this.style = style;
    this.floatPoint = null;

    /**
     * @property {Cesium.Entity} centerPoint 圆中心点
     */
    this.centerPoint = null;

    /**
     * @property {Cesium.Cartesian3} position 圆中心点坐标
     */
    this.position = null;
    this.floatPosition = null;

    /**
     * @property {Number} 圆半径
     */
    this.radius = 0.001;
    this.modifyPoint = null;
    this.pointArr = [];
  }

  /**
   * 开始绘制
   * @param {Function} callback 绘制成功后回调函数
  */
  start(callback) {
    if (!this.prompt && this.promptStyle.show)
      this.prompt = new Prompt(this.viewer, this.promptStyle);
    this.state = "startCreate";
    let that = this;
    if (!this.handler) this.handler = new Cesium.ScreenSpaceEventHandler(this.viewer.scene.canvas);
    this.handler.setInputAction(function (evt) {
      //单击开始绘制
      let cartesian = that.getCatesian3FromPX(evt.position, that.viewer);
      if (!cartesian) return;
      if (!that.centerPoint) {
        that.position = cartesian;
        that.centerPoint = that.createPoint(cartesian);
        that.centerPoint.typeAttr = "center";

        that.floatPoint = that.createPoint(cartesian.clone());
        that.floatPosition = cartesian.clone();
        that.floatPoint.typeAttr = "float";
        that.entity = that.createCircle(that.position, that.radius);
      } else {
        if (that.entity) {
          that.endCreate();
          if (callback) callback(that.entity);
        }
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
    this.handler.setInputAction(function (evt) {
      // 移动时绘制线
      if (!that.centerPoint) {
        that.prompt.update(evt.endPosition, "单击开始绘制");

        return;
      }
      that.state = "creating";
      that.prompt.update(evt.endPosition, "再次单击结束");
      let cartesian = that.getCatesian3FromPX(evt.endPosition, that.viewer);
      if (!cartesian) return;
      if (that.floatPoint) {
        that.floatPoint.position.setValue(cartesian);
        that.floatPosition = cartesian.clone();
      }
      that.radius = Cesium.Cartesian3.distance(cartesian, that.position);
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
  }

  /**
   * 通过坐标数组构建
   * @param {Array} lnglatArr 经纬度坐标数组
   * @callback {Function} callback 绘制成功后回调函数
  */
  createByPositions(lnglatArr, callback) {
    if (!lnglatArr || lnglatArr.length < 1) return;
    this.state = "startCreate";
    if (Array.isArray(lnglatArr)) {
      // 第一种 传入中间点坐标和边界上某点坐标
      let isCartesian3 = lnglatArr[0] instanceof Cesium.Cartesian3;
      let positions = [];
      if (isCartesian3) {
        positions = lnglatArr;
      } else {
        positions = util.lnglatsToCartesians(lnglatArr);
      }
      if (!positions || positions.length < 1) return;
      this.position = positions[0].clone();
      this.radius = Cesium.Cartesian3.distance(this.position, positions[1]);
      this.floatPosition = positions[1].clone();
    } else {
      // 第二种 传入中间点坐标和半径
      this.position = lnglatArr.position;
      this.radius = lnglatArr.radius;
      this.floatPosition = util.getPositionByLength();
    }
    this.centerPoint = this.createPoint(this.position);
    this.centerPoint.typeAttr = "center";
    this.floatPoint = this.createPoint(this.float);
    this.floatPoint.typeAttr = "float";
    this.entity = this.createCircle(this.position, this.radius);
    this.state = "endCreate";
    if (callback) callback(this.entity);
  }

  /**
    * 开始编辑
    * @param {Function} callback 回调函数
    */
  startEdit(callback) {
    if (this.state == "startEdit" || this.state == "editing" || !this.entity)
      return;
    this.state = "startEdit";
    if (!this.modifyHandler)
      this.modifyHandler = new Cesium.ScreenSpaceEventHandler(
        this.viewer.scene.canvas
      );
    let that = this;
    if (that.floatPoint) that.floatPoint.show = true;
    if (that.centerPoint) that.centerPoint.show = true;
    this.modifyHandler.setInputAction(function (evt) {
      if (!that.entity) return;
      that.state = "editing";
      let pick = that.viewer.scene.pick(evt.position);
      if (Cesium.defined(pick) && pick.id) {
        if (!pick.id.objId) that.modifyPoint = pick.id;
        that.forbidDrawWorld(true);
      } else {
        if (that.floatPoint) that.floatPoint.show = false;
        if (that.centerPoint) that.centerPoint.show = false;
        if (that.modifyHandler) {
          that.modifyHandler.destroy();
          that.modifyHandler = null;
          
        }
      }
    }, Cesium.ScreenSpaceEventType.LEFT_DOWN);
    this.modifyHandler.setInputAction(function (evt) {
      if (!that.modifyPoint) return;
      let cartesian = that.getCatesian3FromPX(evt.endPosition, that.viewer);
      if (!cartesian) return;
      that.state = "editing";
      if (that.modifyPoint.typeAttr == "center") {
        // 计算当前偏移量
        let subtract = Cesium.Cartesian3.subtract(
          cartesian,
          that.position,
          new Cesium.Cartesian3()
        );
        that.position = cartesian;
        that.centerPoint.position.setValue(that.position);
        that.entity.position.setValue(that.position);

        that.floatPosition = Cesium.Cartesian3.add(
          that.floatPosition,
          subtract,
          new Cesium.Cartesian3()
        );
        that.floatPoint.position.setValue(that.floatPosition);
      } else {
        that.floatPosition = cartesian;
        that.floatPoint.position.setValue(that.floatPosition);
        that.radius = Cesium.Cartesian3.distance(that.floatPosition, that.position);
      }
      if (callback) callback();
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    this.modifyHandler.setInputAction(function (evt) {
      if (!that.modifyPoint) return;
      that.modifyPoint = null;
      that.forbidDrawWorld(false);
      that.state = "editing";
    }, Cesium.ScreenSpaceEventType.LEFT_UP);
  }

  /**
   * 结束绘制cartesiansToLnglats
   * @param {Function} callback 结束绘制后回调函数
  */
  endCreate() {
    let that = this;
    that.state = "endCreate";
    if (that.handler) {
      that.handler.destroy();
      that.handler = null;
    }
    if (that.floatPoint) that.floatPoint.show = false;
    if (that.centerPoint) that.centerPoint.show = false;
    if (that.prompt) {
      that.prompt.destroy();
      that.prompt = null;
    }
  }

  /**
   * 当前步骤结束
   */
  done() {
    if (this.state == "startCreate") {
      this.destroy();
    } else if (this.state == "creating") {
      this.destroy();
    } else if (this.state == "startEdit" || this.state == "editing") {
      this.endEdit();
    } else {

    }
  }

  /**
    * 结束编辑
    * @param {Function} callback 回调函数
    */
  endEdit(callback) {
    if (this.floatPoint) this.floatPoint.show = false;
    if (this.centerPoint) this.centerPoint.show = false;
    if (this.modifyHandler) {
      this.modifyHandler.destroy();
      this.modifyHandler = null;
      if (callback) callback(this.entity);
    }
    this.forbidDrawWorld(false);
    this.state = "endEdit";
  }

  createCircle() {
    let that = this;
    let defauteObj = {
      semiMajorAxis: new Cesium.CallbackProperty(function () {
        return that.radius;
      }, false),
      semiMinorAxis: new Cesium.CallbackProperty(function () {
        return that.radius;
      }, false),
      material:
        this.style.color instanceof Cesium.Color
          ? this.style.color
          : this.style.color
            ? Cesium.Color.fromCssColorString(this.style.color).withAlpha(
              this.style.colorAlpha || 1
            )
            : Cesium.Color.WHITE,
      outlineColor:
        this.style.outlineColor instanceof Cesium.Color
          ? this.style.outlineColor
          : this.style.outlineColor
            ? Cesium.Color.fromCssColorString(this.style.outlineColor).withAlpha(
              this.style.outlineColorAlpha || 1
            )
            : Cesium.Color.BLACK,
      outline: this.style.outline,
      heightReference : this.style.heightReference,
      outlineWidth: this.style.outlineWidth,
      fill: this.style.fill,
    };
   /*  if (
      !this.style.heightReference ||
      Number(this.style.heightReference) == 0
    ) {
      defauteObj.height = 100 || this.style.height;
      defauteObj.heightReference = 0;
    } else {
      defauteObj.heightReference = 1;
    } */
    let ellipse = this.viewer.entities.add({
      position: this.position,
      ellipse: defauteObj,
    });
    ellipse.objId = this.objId;
    return ellipse;
  }
  setStyle(style) {
    if (!style) return;
    let color = Cesium.Color.fromCssColorString(style.color || "#ffff00");
    color = color.withAlpha(style.colorAlpha);
    this.entity.ellipse.material = color;
    this.entity.ellipse.outline = style.outline;
    this.entity.ellipse.outlineWidth = style.outlineWidth;

    let outlineColor = Cesium.Color.fromCssColorString(
      style.outlineColor || "#000000"
    );
    outlineColor = outlineColor.withAlpha(style.outlineColorAlpha);
    this.entity.ellipse.outlineColor = outlineColor;

    this.entity.ellipse.heightReference = Number(style.heightReference);
    if (style.heightReference == 0) {
      this.entity.ellipse.height = Number(style.height);
      this.updatePointHeight(style.height);
    }
    this.entity.ellipse.fill = Boolean(style.fill);
    this.style = Object.assign(this.style, style);
  }
  getStyle() {
    let obj = {};
    let ellipse = this.entity.ellipse;
    let color = ellipse.material.color.getValue();
    obj.colorAlpha = color.alpha;
    obj.color = new Cesium.Color(
      color.red,
      color.green,
      color.blue,
      1
    ).toCssHexString();
    if (ellipse.outline) obj.outline = ellipse.outline.getValue();
    obj.outlineWidth = ellipse.outlineWidth._value;
    let outlineColor = ellipse.outlineColor.getValue();
    obj.outlineColorAlpha = outlineColor.alpha;
    obj.outlineColor = new Cesium.Color(
      outlineColor.red,
      outlineColor.green,
      outlineColor.blue,
      1
    ).toCssHexString();
    if (ellipse.height) obj.height = ellipse.height.getValue();
    if (ellipse.fill) obj.fill = ellipse.fill.getValue();
    obj.heightReference = ellipse.heightReference.getValue();
    return obj;
  }

  destroy() {
    if (this.handler) {
      this.handler.destroy();
      this.handler = null;
    }
    if (this.modifyHandler) {
      this.modifyHandler.destroy();
      this.modifyHandler = null;
    }
    if (this.entity) {
      this.viewer.entities.remove(this.entity);
      this.entity = null;
    }
    if (this.floatPoint) {
      this.viewer.entities.remove(this.floatPoint);
      this.floatPoint = null;
    }
    if (this.centerPoint) {
      this.viewer.entities.remove(this.centerPoint);
      this.centerPoint = null;
    }

    this.style = null;
    this.modifyPoint = null;
    if (this.prompt) this.prompt.destroy();
    this.forbidDrawWorld(false);
    this.state = "no";
  }
  // 修改点的高度
  updatePointHeight(h) {
    let centerP = this.centerPoint.position.getValue();
    let floatP = this.floatPoint.position.getValue();
    centerP = util.updatePositionsHeight(
      [centerP],
      Number(this.style.height)
    )[0];
    floatP = util.updatePositionsHeight(
      [floatP],
      Number(this.style.height)
    )[0];

    this.centerPoint.position.setValue(centerP);
    this.floatPoint.position.setValue(floatP);
  }
  getPositions(isWgs84) {
    let positions = [];
    if (isWgs84) {
      positions = util.cartesiansToLnglats([this.position, this.floatPosition],this.viewer);
    } else {
      positions = [this.position, this.floatPosition];
    }
    return positions;
  }

}

export default CreateCircle;