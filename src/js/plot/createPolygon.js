import '../prompt/prompt.css'
import Prompt from '../prompt/prompt.js'
import BasePlot from './basePlot'
import util from '../util';

/**
 * 面标绘类
 * @class
 * @augments BasePlot
 * @alias BasePlot.CreatePolygon
 */
class CreatePolygon extends BasePlot {
	constructor(viewer, style) {
		super(viewer, style);
		this.type = "polygon";
		this.viewer = viewer;
		this.entity = null;
		this.polyline = null;
		let defaultStyle = {
			outlineColor: "#000000",
			outlineWidth: 2
		}
		this.style = Object.assign(defaultStyle, style || {});
		this.outline = null;
	}

	start(callback) {
		if (!this.prompt && this.promptStyle.show) this.prompt = new Prompt(this.viewer, this.promptStyle);
		this.state = "startCreate";
		let that = this;
		if (!this.handler) this.handler = new Cesium.ScreenSpaceEventHandler(this.viewer.scene.canvas);
		this.handler.setInputAction(function (evt) { //单击开始绘制
			let cartesian = that.getCatesian3FromPX(evt.position, that.viewer, []);
			if (!cartesian) return;

			if (that.movePush) {
				that.positions.pop();
				that.movePush = false;
			}
			that.positions.push(cartesian);
			let point = that.createPoint(cartesian);
			point.wz = that.positions.length - 1;
			that.controlPoints.push(point);
		}, Cesium.ScreenSpaceEventType.LEFT_CLICK);
		this.handler.setInputAction(function (evt) { //移动时绘制面
			if (that.positions.length < 1) {
				that.prompt.update(evt.endPosition, "单击开始绘制");
				that.state = "startCreate";
				return;
			}
			if (that.prompt) that.prompt.update(evt.endPosition, "双击结束，右键取消上一步");
			let cartesian = that.getCatesian3FromPX(evt.endPosition, that.viewer, []);
			if (that.positions.length >= 1) {
				that.state = "creating";
				if (!that.movePush) {
					that.positions.push(cartesian);
					that.movePush = true;
				} else {
					that.positions[that.positions.length - 1] = cartesian;
				}
				if (that.positions.length == 2) {
					if (!Cesium.defined(that.polyline)) {
						that.polyline = that.createPolyline();
					}
				}
				if (that.positions.length == 3) {
					if (!Cesium.defined(that.entity)) {
						that.entity = that.createPolygon(that.style);
						if (!that.style.outline && that.polyline) { // 不需要创建轮廓 则后续删除
							that.polyline.show = false;
						}
						that.entity.objId = that.objId;
					}
				}
			}
		}, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

		this.handler.setInputAction(function (evt) {
			if (!that.entity) return;
			that.positions.splice(that.positions.length - 2, 1);
			that.viewer.entities.remove(that.controlPoints.pop());
			if (that.positions.length == 2) {
				if (that.entity) {
					that.viewer.entities.remove(that.entity);
					that.entity = null;
					if (that.polyline) that.polyline.show = true;
				}
			}
			if (that.positions.length == 1) {
				if (that.polyline) {
					that.viewer.entities.remove(that.polyline);
					that.polyline = null;
				}
				if (that.prompt) that.prompt.update(evt.endPosition, "单击开始绘制");
				that.positions = [];
				that.movePush = false;
			}

		}, Cesium.ScreenSpaceEventType.RIGHT_CLICK);

		this.handler.setInputAction(function (evt) { //双击结束绘制
			if (!that.entity) return;
			that.endCreate();
			if (callback) callback(that.entity);
		}, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
	}

	endCreate() {
		let that = this;
		that.state = "endCreate";
		that.positions.pop();
		that.viewer.entities.remove(that.controlPoints.pop());
		if (that.handler) {
			that.handler.destroy();
			that.handler = null;
		}
		that.movePush = false;
		if (that.prompt) {
			that.prompt.destroy();
			that.prompt = null;
		}

		that.viewer.trackedEntity = undefined;
		that.viewer.scene.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
		
	}

	/**
     * 当前步骤结束
     */
    done() {
        if (this.state == "startCreate") {
            this.destroy();
        } else if (this.state == "creating") {
            if (this.positions.length <= 2 && this.movePush == true) {
                this.destroy();
            } else {
                this.endCreate();
            }
        } else if (this.state == "startEdit" || this.state == "editing") {
            this.endEdit();
        } else {

        }
    }

	createByPositions(lnglatArr, callback) { //通过传入坐标数组创建面
		if (!lnglatArr) return;
		this.state = "startCreate";
		let positions = (lnglatArr[0] instanceof Cesium.Cartesian3) ? lnglatArr : util.lnglatsToCartesians(lnglatArr);
		if (!positions) return;
		this.entity = this.createPolygon();
		this.polyline = this.createPolyline();
		this.polyline.show = this.style.outline;

		this.positions = positions;
		for (let i = 0; i < positions.length; i++) {
			let newP = positions[i];
			let ctgc = Cesium.Cartographic.fromCartesian(positions[i]);
			let point = this.createPoint(newP);
			point.point.heightReference = this.style.heightReference;
			point.ctgc = ctgc;
			point.wz = this.controlPoints.length;
			this.controlPoints.push(point);
		}
		this.state = "endCreate";
		this.entity.objId = this.objId;

		if (callback) callback(this.entity);
	}
	getStyle() {
		if (!this.entity) return;
		let obj = {};
		let polygon = this.entity.polygon;

		if (polygon.material instanceof Cesium.ColorMaterialProperty) {
			obj.material = "common";
			let color = polygon.material.color.getValue();
			obj.colorAlpha = color.alpha;
			obj.color = new Cesium.Color(color.red, color.green, color.blue, 1).toCssHexString();
		} else {

		}

		obj.fill = polygon.fill ? polygon.fill.getValue() : false;
		if (polygon.heightReference) {
			let heightReference = polygon.heightReference.getValue();
			obj.heightReference = Number(heightReference);
		}

		/* obj.heightReference = isNaN(polygon.heightReference.getValue()) ? false : polygon.heightReference.getValue(); */
		let outline = this.polyline.polyline;
		if (outline && this.polyline.show) {
			obj.outlineWidth = outline.width.getValue();
			/* obj.outline = "show"; */
			obj.outline = true;
			let oColor = outline.material.color.getValue();
			obj.outlineColorAlpha = oColor.alpha;
			obj.outlineColor = new Cesium.Color(oColor.red, oColor.green, oColor.blue, 1).toCssHexString();
		} else {
			/* obj.outline = "hide"; */
			obj.outline = false;
		}
		return obj;

	}
	// 设置相关样式
	setStyle(style) {
		if (!style) return;
		// 由于官方api中的outline限制太多 此处outline为重新构建的polyline
		/* this.polyline.show = style.outline.show == "show" ? true : false; */
		this.polyline.show = style.outline;
		let outline = this.polyline.polyline;
		outline.width = style.outlineWidth;
		this.polyline.clampToGround = Boolean(style.heightReference);
		let outlineColor = (style.outlineColor instanceof Cesium.Color) ? style.outlineColor : Cesium.Color.fromCssColorString(style.outlineColor);
		let outlineMaterial = outlineColor.withAlpha(style.outlineColorAlpha || 1);
		outline.material = outlineMaterial;
		if (style.heightReference != undefined) this.entity.polygon.heightReference = Number(style.heightReference);
		let color = style.color instanceof Cesium.Color ? style.color : Cesium.Color.fromCssColorString(style.color);
		let material = color.withAlpha(style.colorAlpha || 1);
		this.entity.polygon.material = material;
		if (style.fill != undefined) this.entity.polygon.fill = style.fill;
		this.style = Object.assign(this.style, style);
	}

	createPolygon() {
		let that = this;
		this.style.color = this.style.color || Cesium.Color.WHITE;
		this.style.outlineColor = this.style.outlineColor || Cesium.Color.BLACK;
		let polygonObj = {
			polygon: {
				hierarchy: new Cesium.CallbackProperty(function () {
					return new Cesium.PolygonHierarchy(that.positions)
				}, false),
				heightReference: Number(this.style.heightReference),
				show: true,
				fill: this.style.fill == undefined ? true : this.style.fill,
				material: this.style.color instanceof Cesium.Color ? this.style.color : Cesium.Color.fromCssColorString(this.style.color).withAlpha(this.style.colorAlpha || 1)
			}
		}

		if (!this.style.heightReference) {
			polygonObj.polygon.height = 0; // 不贴地 必设
			polygonObj.polygon.perPositionHeight = true; // 启用点的真实高度
		}
		return this.viewer.entities.add(polygonObj);
	}
	createPolyline() {
		let that = this;
		return this.viewer.entities.add({
			polyline: {
				positions: new Cesium.CallbackProperty(function () {
					let newPositions = that.positions.concat(that.positions[0]);
					return newPositions
				}, false),
				clampToGround: Boolean(this.style.heightReference),
				material: this.style.outlineColor instanceof Cesium.Color ? this.style.outlineColor : Cesium.Color.fromCssColorString(this.style.outlineColor).withAlpha(this.style.outlineColorAlpha || 1),
				width: this.style.outlineWidth || 1
			}
		});
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
		if (this.polyline) {
			this.viewer.entities.remove(this.polyline);
			this.polyline = null;
		}
		this.positions = [];
		this.style = null;
		if (this.modifyPoint) {
			this.viewer.entities.remove(this.modifyPoint);
			this.modifyPoint = null;
		}
		for (let i = 0; i < this.controlPoints.length; i++) {
			let point = this.controlPoints[i];
			this.viewer.entities.remove(point);
		}
		this.controlPoints = [];
		this.state = "no";
		if (this.prompt) this.prompt.destroy();
		if (this.polyline) {
			this.polyline = null;
			this.viewer.entities.remove(this.polyline);
		}
		this.forbidDrawWorld(false);
	}

}

export default CreatePolygon;