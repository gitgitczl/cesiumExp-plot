import '../prompt/prompt.css'
import Prompt from '../prompt/prompt.js'
import BasePlot from './basePlot';
import util from '../util';

/**
 * 小模型（gltf、glb）标绘类
 * @class
 * @augments BasePlot
 * @alias BasePlot.CreateGltfModel
 */
class CreateGltfModel extends BasePlot {
  constructor(viewer, style) {
    super(viewer, style);
    this.type = "gltfModel";
    style = style || {};
    this.viewer = viewer;
    if (!style.uri) {
      console.warn("请输入模型地址！");
      return;
    }

    let defaultStyle = {
      heading: 0,
      pitch: 0,
      roll: 0,
      minimumPixelSize: 24,
      maximumScale: 120
    }
    this.style = Object.assign(defaultStyle, style || {});
    /**
     * @property {String} modelUri 模型地址
     */
    this.modelUri = style.uri;
    this.entity = null;
  }

  start(callback) {
    if (!this.prompt && this.promptStyle.show) this.prompt = new Prompt(this.viewer, this.promptStyle);
    this.state = "startCreate";
    let that = this;
    if (!this.handler) this.handler = new Cesium.ScreenSpaceEventHandler(this.viewer.scene.canvas);
    this.handler.setInputAction(function (evt) { //单击开始绘制
      let cartesian = that.getCatesian3FromPX(evt.position, that.viewer);
      if (cartesian) {
        that.entity.position = cartesian;
        that.position = cartesian.clone();
      }
      that.endCreate();
      if (callback) callback(that.entity);
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
    this.handler.setInputAction(function (evt) { //单击开始绘制
      that.prompt.update(evt.endPosition, "单击新增");
      that.state = "creating";
      let cartesian = that.getCatesian3FromPX(evt.endPosition, that.viewer, [that.entity]);
      if (!cartesian) return;
      if (!that.entity) {
        that.entity = that.createGltfModel(cartesian.clone());
      } else {
        that.entity.position = cartesian;
      }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
  }
  createByPositions(lnglatArr, callback) {
    if (!lnglatArr) return;
    this.state = "startCreate";
    if (lnglatArr instanceof Cesium.Cartesian3) {
      this.position = lnglatArr;
    } else {
      this.position = Cesium.Cartesian3.fromDegrees(lnglatArr[0], lnglatArr[1], lnglatArr[2] || 0);
    }
    this.entity = this.createGltfModel(this.position);
    callback(this.entity);
    this.state = "endCreate";
  }
  startEdit(callback) {
    if (this.state == "startEdit" || this.state == "editing") return; //表示还没绘制完成
    if (!this.modifyHandler) this.modifyHandler = new Cesium.ScreenSpaceEventHandler(this.viewer.scene.canvas);
    let that = this;
    let eidtModel;
    this.state = "startEdit";
    this.modifyHandler.setInputAction(function (evt) {
      let pick = that.viewer.scene.pick(evt.position);
      if (Cesium.defined(pick) && pick.id) {
        eidtModel = pick.id;
        that.forbidDrawWorld(true);
      }
    }, Cesium.ScreenSpaceEventType.LEFT_DOWN);
    this.modifyHandler.setInputAction(function (evt) {
      if (!eidtModel) return;
      let cartesian = that.getCatesian3FromPX(evt.endPosition, that.viewer, [that.entity]);
      if (!cartesian) return;
      if (that.entity) {
        that.entity.position.setValue(cartesian);
        that.position = cartesian.clone();
      }
      that.state = "editing";
      if(callback) callback();
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    this.modifyHandler.setInputAction(function (evt) {
      if (!eidtModel) return;
      that.forbidDrawWorld(false);
      if (that.modifyHandler) {
        that.modifyHandler.destroy();
        that.modifyHandler = null;
      }
      that.state = "editing";
    }, Cesium.ScreenSpaceEventType.LEFT_UP);
  }

  endCreate() {
    let that = this;
    that.state = "endCreate";
    if (that.handler) {
      that.handler.destroy();
      that.handler = null;
    }
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

  endEdit(callback) {
    if (this.modifyHandler) {
      this.modifyHandler.destroy();
      this.modifyHandler = null;
      if (callback) callback(this.entity);
    }
    this.forbidDrawWorld(false);
    this.state = "endEdit";
  }
  createGltfModel(cartesian) {
    if (!cartesian) return;
    let heading = Cesium.Math.toRadians(this.style.heading);
    let pitch = Cesium.Math.toRadians(this.style.pitch);
    let roll = Cesium.Math.toRadians(this.style.roll);
    let hpr = new Cesium.HeadingPitchRoll(heading, pitch, roll);
    let orientation = Cesium.Transforms.headingPitchRollQuaternion(cartesian, hpr);

    let entity = this.viewer.entities.add({
      position: cartesian,
      orientation: orientation,
      model: {
        uri: this.modelUri,
        minimumPixelSize: this.style.minimumPixelSize,
        maximumScale: this.style.maximumScale,
        scale: this.style.scale || 1,
        heightReference: this.style.heightReference
      }
    });
    entity.objId = this.objId;
    return entity;
  }
  getPositions(isWgs84) {
    return isWgs84 ? util.cartesianToLnglat(this.position, this.viewer) : this.position
  }
  getStyle() {
    let obj = {};
    let model = this.entity.model;
    obj.minimumPixelSize = model.minimumPixelSize.getValue();
    let orientation = this.entity.orientation.getValue();
    let p = this.entity.position.getValue(this.viewer.clock.currentTime);
    let hpr = util.oreatationToHpr(p.clone(), orientation, true) || {};
    obj.heading = (hpr.heading || 0) < 360 ? (hpr.heading + 360) : hpr.heading;
    obj.pitch = hpr.pitch || 0;
    obj.roll = hpr.roll || 0;
    obj.scale = model.scale.getValue();
    obj.uri = model.uri.getValue();

    let heightReference = this.entity.heightReference && this.entity.heightReference.getValue();
    if(heightReference!=undefined) obj.heightReference = Number(heightReference);
    return obj;
  }
  setStyle(style) {
    if (!style) return;
    this.setOrientation(style.heading, style.pitch, style.roll);
    this.entity.model.scale.setValue(style.scale == undefined ? 1 : style.scale);
    if (style.uri) this.entity.model.uri.setValue(style.uri);
    if (style.heightReference != undefined) this.entity.model.heightReference.setValue(Number(style.heightReference));
    this.style = Object.assign(this.style, style);
  }

  /**
   * 设置模型姿态
   * @param {Number} h 偏转角
   * @param {Number} p 仰俯角
   * @param {Number} r 翻滚角
   */
  setOrientation(h, p, r) {
    h = h || 0;
    p = p || 0;
    r = r || 0;
    this.style.heading = h;
    this.style.pitch = p;
    this.style.roll = r;
    var heading = Cesium.Math.toRadians(h || 0);
    var pitch = Cesium.Math.toRadians(p || 0);
    var roll = Cesium.Math.toRadians(r || 0);
    var hpr = new Cesium.HeadingPitchRoll(heading, pitch, roll);
    var position = this.entity.position._value;
    var orientation = Cesium.Transforms.headingPitchRollQuaternion(
      position,
      hpr
    );
    if (this.entity) this.entity.orientation = orientation;
  }

  remove() {
    if (this.entity) {
      this.state = "no";
      this.viewer.entities.remove(this.entity);
      this.entity = null;
    }
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
    this.style = null;
    if (this.prompt) {
      this.prompt.destroy();
      this.prompt = null;
    }
  }

}

export default CreateGltfModel;