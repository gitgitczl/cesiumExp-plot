//绘制矩形
import '../prompt/prompt.css'
import Prompt from '../prompt/prompt.js'
import BasePlot from './basePlot';

/**
 * 矩形标绘类
 * @class
 * @augments BasePlot
 * @alias BasePlot.BasePlot
 */
class CreateRectangle extends BasePlot {
  constructor(viewer, style) {
    super(viewer, style);
    this.type = "rectangle";
    this.viewer = viewer;
    this.style = style;

    /**
     * @property {Cesium.Entity} rightdownPoint 右下角实体点
     */
    this.rightdownPoint = null;

    /**
    * @property {Cesium.Entity} leftupPoint 左上角实体点
    */
    this.leftupPoint = null;

    /**
     * @property {Cesium.Cartesian3} leftup 左上角点坐标
     */
    this.leftup = null;

    /**
    * @property {Cesium.Cartesian3} rightdown 右下角点坐标
    */
    this.rightdown = null;

    this.modifyPoint = null;
    this.pointArr = [];
  }
  start(callback) {
    if (!this.prompt && this.promptStyle.show) this.prompt = new Prompt(this.viewer, this.promptStyle);
    this.state = "startCreate";
    let that = this;
    if (!this.handler) this.handler = new Cesium.ScreenSpaceEventHandler(this.viewer.scene.canvas);
    this.handler.setInputAction(function (evt) { //单击开始绘制
      let cartesian = that.getCatesian3FromPX(evt.position, that.viewer, []);
      if (!cartesian) return;
      if (!that.leftupPoint) {
        that.leftup = cartesian;
        that.leftupPoint = that.createPoint(cartesian);
        that.leftupPoint.typeAttr = "leftup";
        that.rightdownPoint = that.createPoint(cartesian.clone());
        that.rightdown = cartesian.clone();
        that.rightdownPoint.typeAttr = "rightdown";
        that.entity = that.createRectangle();
      } else {
        if (!that.entity) {
          return;
        }
        that.endCreate();
        if (callback) callback(that.entity);
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
    this.handler.setInputAction(function (evt) { //移动时绘制线
      if (!that.leftupPoint) {
        that.prompt.update(evt.endPosition, "单击开始绘制");
        that.state = "startCreate";
        return;
      }
      that.prompt.update(evt.endPosition, "单击结束");
      let cartesian = that.getCatesian3FromPX(evt.endPosition, that.viewer, []);
      if (!cartesian) return;
      if (that.rightdownPoint) {
        that.rightdownPoint.position.setValue(cartesian);
        that.rightdown = cartesian.clone();
        that.state = "creating";
      }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
  }

  endCreate() {
    let that = this;
    if (that.handler) {
      that.handler.destroy();
      that.handler = null;
    }
    if (that.rightdownPoint) that.rightdownPoint.show = false;
    if (that.leftupPoint) that.leftupPoint.show = false;
    if (that.prompt) {
      that.prompt.destroy();
      that.prompt = null;
    }
    that.state = "endCreate";
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

  startEdit(callback) {
    if (this.state == "startEdit" || this.state == "editing" || !this.entity) return;
    this.state = "startEdit";
    if (!this.modifyHandler) this.modifyHandler = new Cesium.ScreenSpaceEventHandler(this.viewer.scene.canvas);
    let that = this;
    if (that.rightdownPoint) that.rightdownPoint.show = true;
    if (that.leftupPoint) that.leftupPoint.show = true;
    this.modifyHandler.setInputAction(function (evt) {
      if (!that.entity) return;
      let pick = that.viewer.scene.pick(evt.position);
      if (Cesium.defined(pick) && pick.id) {
        if (!pick.id.objId)
          that.modifyPoint = pick.id;
        that.forbidDrawWorld(true);
      }
    }, Cesium.ScreenSpaceEventType.LEFT_DOWN);
    this.modifyHandler.setInputAction(function (evt) {
      if (!that.modifyPoint) return;
      let cartesian = that.getCatesian3FromPX(evt.endPosition, that.viewer, [that.entity, that.modifyPoint]);
      if (!cartesian) {
        return;
      }
      that.state == "editing";
      if (that.modifyPoint.typeAttr == "leftup") {
        that.leftup = cartesian
        that.leftupPoint.position.setValue(that.leftup);
        that.entity.position.setValue(that.leftup);
      } else {
        that.rightdown = cartesian
        that.rightdownPoint.position.setValue(that.rightdown);
      }
      if(callback) callback();
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    this.modifyHandler.setInputAction(function (evt) {
      if (!that.modifyPoint) return;
      that.modifyPoint = null;
      that.forbidDrawWorld(false);
      that.state == "editing";
    }, Cesium.ScreenSpaceEventType.LEFT_UP);
  }
  endEdit(callback) {
    if (this.rightdownPoint) this.rightdownPoint.show = false;
    if (this.leftupPoint) this.leftupPoint.show = false;
    if (this.modifyHandler) {
      this.modifyHandler.destroy();
      this.modifyHandler = null;
      if (callback) callback(this.entity);
    }
    this.forbidDrawWorld(false);
    this.state = "endEdit";
  }

  createRectangle() {
    let that = this;
    let rectangle = this.viewer.entities.add({
      rectangle: {
        coordinates: new Cesium.CallbackProperty(function () {
          return Cesium.Rectangle.fromCartesianArray([that.leftup, that.rightdown])
        }, false),
        heightReference: this.style.heightReference || 0,
        show: true,
        fill: this.style.fill || true,
        material: this.style.color instanceof Cesium.Color ? this.style.color : (this.style.color ? Cesium.Color.fromCssColorString(this.style.color).withAlpha(this.style.colorAlpha || 1) : Cesium.Color.WHITE),
        outlineColor: this.style.outlineColor instanceof Cesium.Color ? this.style.outlineColor : (this.style.outlineColor ? Cesium.Color.fromCssColorString(this.style.outlineColor).withAlpha(this.style.outlineColorAlpha || 1) : Cesium.Color.BLACK),
        outlineWidth: 1,
        outline: this.style.outline,
      }
    });
    rectangle.objId = this.objId;
    return rectangle;
  }
  getPositions(isWgs84) {
    let positions = [];
    if (isWgs84) {
      positions = util.cartesiansToLnglats([this.leftup, this.rightdown],this.viewer);
    } else {
      positions = [this.leftup, this.rightdown];
    }
    return positions;
  }
  getStyle() {
    let obj = {};
    let rectangle = this.entity.rectangle;
    let color = rectangle.material.color.getValue();
    obj.colorAlpha = color.alpha;
    obj.color = new Cesium.Color(color.red, color.green, color.blue, 1).toCssHexString();
    if (rectangle.outline) obj.outline = rectangle.outline.getValue();
    obj.outlineWidth = rectangle.outlineWidth._value;
    let outlineColor = rectangle.outlineColor.getValue();
    obj.outlineColorAlpha = outlineColor.alpha;
    obj.outlineColor = new Cesium.Color(outlineColor.red, outlineColor.green, outlineColor.blue, 1).toCssHexString();
    if (obj.height) obj.height = rectangle.height.getValue();
    if (rectangle.fill) obj.fill = rectangle.fill.getValue();
    obj.heightReference = rectangle.heightReference.getValue();
    return obj;
  }
  setStyle(style) {
    if (!style) return;
    let color = style.color instanceof Cesium.Color ? style.color : Cesium.Color.fromCssColorString(style.color || "#ffff00");
    if (style.colorAlpha) color = color.withAlpha(style.colorAlpha);
    this.entity.rectangle.material = color;
    this.entity.rectangle.outline = style.outline;
    this.entity.rectangle.outlineWidth = style.outlineWidth;

    let outlineColor = style.outlineColor instanceof Cesium.Color ? style.outlineColor : Cesium.Color.fromCssColorString(style.outlineColor || "#000000");
    if (style.outlineColorAlpha) outlineColor = outlineColor.withAlpha(style.outlineColorAlpha)
    this.entity.rectangle.outlineColor = outlineColor;

    this.entity.rectangle.heightReference = Number(style.heightReference);
    if (style.heightReference == 0) {
      this.entity.rectangle.height = Number(style.height);
      this.updatePointHeight(style.height);
    }
    this.entity.rectangle.fill = Boolean(style.fill);
    this.style = Object.assign(this.style, style);
  }
}

export default CreateRectangle;