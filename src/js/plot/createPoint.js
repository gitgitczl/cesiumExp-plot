import '../prompt/prompt.css'
import Prompt from '../prompt/prompt.js'
import BasePlot from './basePlot';
import util from "../util";

/**
 * 点标绘类
 * @class
 * @augments BasePlot
 * @alias BasePlot.CreatePoint
 */
class CreatePoint extends BasePlot {
	constructor(viewer, style) {
		super(viewer, style);
		this.type = "point";
		this.viewer = viewer;
		let defaultStyle = {
			color: Cesium.Color.AQUA,
			pixelSize: 10,
			outlineWidth: 1
		}
		this.style = Object.assign(defaultStyle, style || {});

		/**
		 * @property {Cesium.Cartesian3} 坐标
		 */
		this.position = null;
	}

	start(callback) {
		if (!this.prompt && this.promptStyle.show) this.prompt = new Prompt(this.viewer, this.promptStyle);
		this.state = "startCreate";
		let that = this;
		if (!this.handler) this.handler = new Cesium.ScreenSpaceEventHandler(this.viewer.scene.canvas);
		this.handler.setInputAction(function (evt) { //单击开始绘制
			let cartesian = that.getCatesian3FromPX(evt.position, that.viewer);
			if (!cartesian) return;
			that.entity = that.createPoint(cartesian);
			that.position = cartesian;
			if (that.handler) {
				that.handler.destroy();
				that.handler = null;
			}
			if (that.prompt) {
				that.prompt.destroy();
				that.prompt = null;
			}
			that.state = "endCreate";
			if (callback) callback(that.entity);
		}, Cesium.ScreenSpaceEventType.LEFT_CLICK);
		this.handler.setInputAction(function (evt) { //单击开始绘制
			that.prompt.update(evt.endPosition, "单击新增");
			that.state = "creating";
		}, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
	}

	endCreate() {
		let that = this;
		if (that.handler) {
			that.handler.destroy();
			that.handler = null;
		}
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

	createByPositions(lnglatArr, callback) {
		if (!lnglatArr) return;
		this.state = "startCreate";
		let position = (lnglatArr instanceof Cesium.Cartesian3) ? lnglatArr : Cesium.Cartesian3.fromDegrees(lnglatArr[0], lnglatArr[1], lnglatArr[2]);
		this.position = position;
		if (!position) return;
		this.entity = this.createPoint(position);
		if (callback) callback(this.entity);
		this.state = "endCreate";
	}

	// 设置相关样式
	setStyle(style) {
		if (!style) return;
		if (style.color) {
			let color = Cesium.Color.fromCssColorString(style.color || "#ffff00");
			color = color.withAlpha(style.colorAlpha);
			this.entity.point.color = color;
		}
		this.entity.point.outlineWidth = Number(style.outlineWidth);
		if (style.outlineColor) {
			let outlineColor = Cesium.Color.fromCssColorString(style.outlineColor || "#000000");
			outlineColor = outlineColor.withAlpha(style.outlineColorAlpha)
			this.entity.point.outlineColor = outlineColor;
		}
		this.entity.point.heightReference = Number(style.heightReference);
		this.entity.point.pixelSize = Number(style.pixelSize);
		this.style = Object.assign(this.style, style);
	}
	// 获取相关样式
	getStyle() {
		let obj = {};
		let point = this.entity.point;

		let color = point.color.getValue();
		obj.colorAlpha = color.alpha;
		obj.color = new Cesium.Color(color.red, color.green, color.blue, 1).toCssHexString();

		obj.outlineWidth = point.outlineWidth._value;
		let outlineColor = point.outlineColor.getValue();
		obj.outlineColorAlpha = outlineColor.alpha;
		obj.outlineColor = new Cesium.Color(outlineColor.red, outlineColor.green, outlineColor.blue, 1).toCssHexString();

		if (point.heightReference != undefined) obj.heightReference = point.heightReference.getValue();
		obj.pixelSize = Number(point.pixelSize);
		return obj;
	}
	getPositions(isWgs84) {
		return isWgs84 ? util.cartesianToLnglat(this.position) : this.position
	}

	getLnglats(){
		return this.getPositions(true);
	}
	
	startEdit(callback) {
		if (this.state == "startEdit" || this.state == "editing" || !this.entity) return;
		this.state = "startEdit";
		if (!this.modifyHandler) this.modifyHandler = new Cesium.ScreenSpaceEventHandler(this.viewer.scene.canvas);
		let that = this;
		let editPoint;
		this.modifyHandler.setInputAction(function (evt) {
			let pick = that.viewer.scene.pick(evt.position);
			if (Cesium.defined(pick) && pick.id) {
				editPoint = pick.id;
				that.forbidDrawWorld(true);
			}
		}, Cesium.ScreenSpaceEventType.LEFT_DOWN);
		this.modifyHandler.setInputAction(function (evt) {
			if (!editPoint) return;
			let cartesian = that.getCatesian3FromPX(evt.endPosition, that.viewer);
			if (!cartesian) return;
			if (that.entity) {
				that.entity.position.setValue(cartesian);
				that.position = cartesian;
				that.state = "editing";
			}
			if(callback) callback();
		}, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

		this.modifyHandler.setInputAction(function (evt) {
			if (!editPoint) return;
			that.forbidDrawWorld(false);
			if (that.modifyHandler) {
				that.modifyHandler.destroy();
				that.modifyHandler = null;
				that.state = "editing";
			}
		}, Cesium.ScreenSpaceEventType.LEFT_UP);
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
	createPoint(cartesian) {
		if (!cartesian) return;
		let point = this.viewer.entities.add({
			position: cartesian,
			point: {
				color: this.style.color instanceof Cesium.Color ? this.style.color : (this.style.color ? Cesium.Color.fromCssColorString(this.style.color).withAlpha(this.style.colorAlpha || 1) : Cesium.Color.WHITE),
				outlineColor: this.style.outlineColor instanceof Cesium.Color ? this.style.outlineColor : (this.style.outlineColor ? Cesium.Color.fromCssColorString(this.style.outlineColor).withAlpha(this.style.outlineColorAlpha || 1) : Cesium.Color.BLACK),
				outlineWidth: this.style.outlineWidth || 4,
				pixelSize: this.style.pixelSize || 20,
				disableDepthTestDistance: Number.MAX_VALUE
			}
		})
		point.objId = this.objId;
		return point;
	}

}


export default CreatePoint;