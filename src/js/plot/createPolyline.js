// 绘制线
import BasePlot from "./basePlot";
import '../prompt/prompt.css'
import Prompt from '../prompt/prompt.js'
/* import animate from "../material/animate" */ // 动态材质
// 注册自定义材质
/**
 * 线标绘类
 * @class
 * @augments BasePlot
 * @alias BasePlot.CreatePolyline
 */
class CreatePolyline extends BasePlot {
    constructor(viewer, style) {
        super(viewer, style);
        style = style || {};
        this.movePush = false;
        this.type = "polyline";
        /**
         * @property {Number} [maxPointNum=Number.MAX_VALUE] 线的最大点位数量
        */
        this.maxPointNum = style.maxPointNum || Number.MAX_VALUE; // 最多点数
    }

    /**
     * 开始绘制
     * @param {Function} callback 绘制完成之后的回调函数
     */
    start(callback) {
        if (!this.prompt && this.promptStyle.show) this.prompt = new Prompt(this.viewer, this.promptStyle);
        this.state = "startCreate";
        let that = this;
        if (!this.handler) this.handler = new Cesium.ScreenSpaceEventHandler(this.viewer.scene.canvas);
        this.handler.setInputAction(function (evt) { //单击开始绘制
            let cartesian = that.getCatesian3FromPX(evt.position, that.viewer, [that.entity]);
            if (!cartesian) return;
            if (that.movePush) {
                that.positions.pop();
                that.movePush = false;
            }
            that.positions.push(cartesian);
            let point = that.createPoint(cartesian);
            point.wz = that.positions.length - 1;
            that.controlPoints.push(point);

            // 达到最大数量 结束绘制
            if (that.positions.length == that.maxPointNum) {
                that.endCreate();
                if (callback) callback(that.entity);
            }

        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

        this.handler.setInputAction(function (evt) { //移动时绘制线
            that.state = "creating";
            if (that.positions.length < 1) {
                that.prompt.update(evt.endPosition, "单击开始绘制");
                that.state = "startCreate";
                return;
            }
            that.prompt.update(evt.endPosition, "右键取消上一步，双击结束");
            let cartesian = that.getCatesian3FromPX(evt.endPosition, that.viewer, [that.entity]);
            if (!cartesian) return;

            if (!that.movePush) {
                that.positions.push(cartesian);
                that.movePush = true;
            } else {
                that.positions[that.positions.length - 1] = cartesian;
            }

            if (that.positions.length == 2) {
                if (!Cesium.defined(that.entity)) {
                    that.entity = that.createPolyline();
                }
            }
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

        this.handler.setInputAction(function (evt) { //右键取消上一步
            if (!that.entity) {
                return;
            }
            that.positions.splice(that.positions.length - 2, 1);
            that.viewer.entities.remove(that.controlPoints.pop())
            if (that.positions.length == 1) {
                if (that.entity) {
                    that.viewer.entities.remove(that.entity);
                    that.entity = null;
                }
                that.prompt.update(evt.endPosition, "单击开始绘制");
                that.movePush = false;
                that.positions = [];
            }
        }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);

        this.handler.setInputAction(function (evt) { //双击结束绘制
            if (!that.entity) {
                return;
            }
            that.endCreate();
            if (callback) callback(that.entity);
        }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
    }

    endCreate() {
        let that = this;
        that.state = "endCreate";
        if (that.handler) {
            that.handler.destroy();
            that.handler = null;
        }
        that.positions.pop();
        that.viewer.entities.remove(that.controlPoints.pop())
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
        if (!lnglatArr || lnglatArr.length < 1) return;
        this.state = "startCreate";
        let positions = (lnglatArr[0] instanceof Cesium.Cartesian3) ? lnglatArr : util.lnglatsToCartesians(lnglatArr);
        if (!positions) return;
        this.entity = this.createPolyline(this.style);
        this.positions = positions;
        if (callback) callback(this.entity);
        for (let i = 0; i < positions.length; i++) {
            let newP = positions[i];

            let point = this.createPoint(newP);
            if (this.style.clampToGround) {
                point.point.heightReference = 1;
            }
            point.wz = this.controlPoints.length;
            this.controlPoints.push(point);
        }
        this.state = "endCreate";
    }

    setStyle(style) {
        if (!style) return;

        let material = this.getMaterial(style.material, style);
        this.entity.polyline.material = material;
        this.entity.polyline.clampToGround = Boolean(style.clampToGround);
        if (style.width) this.entity.polyline.width = style.width || 3;
        this.style = Object.assign(this.style, style);
    }
    // 获取相关样式
    getStyle() {
        if (!this.entity) return;
        let obj = {};
        let polyline = this.entity.polyline;
        if (this.style.animateType != undefined) {
            obj.animateType = this.style.animateType;
            obj.image = this.style.image;
            obj.duration = this.style.duration;
        }
        if (polyline.material instanceof Cesium.ColorMaterialProperty) {
            obj.material = "common";
        } else {
            obj.material = "flowline";
            if (polyline.material instanceof animate.FlowLineMaterial) {
            }
            obj.duration = polyline.material._duration;
            obj.image = polyline.material.url;
        }

        let color = polyline.material.color.getValue();
        obj.colorAlpha = color.alpha;
        obj.color = new Cesium.Color(color.red, color.green, color.blue, 1).toCssHexString();
        obj.width = polyline.width._value;
        let clampToGround = polyline.clampToGround ? polyline.clampToGround.getValue() : false;
        obj.clampToGround = Boolean(clampToGround);
        return obj;
    }

    createPolyline() {
        let that = this;

        let polyline = this.viewer.entities.add({
            polyline: {
                positions: new Cesium.CallbackProperty(function () {
                    return that.positions
                }, false),
                show: true,
                material: this.getMaterial(this.style.animateType, this.style),
                width: this.style.width || 3,
                clampToGround: this.style.clampToGround
            }
        });
        polyline.objId = this.objId; // 此处进行和entityObj进行关联
        return polyline;
    }

    getMaterial(animateType, style) {
        // 构建多种材质的线
        style = style || {};
        let material = null;
        let color = style.color || Cesium.Color.WHITE;
        color = color instanceof Cesium.Color ? color : Cesium.Color.fromCssColorString(style.color);
        color = color.withAlpha(style.colorAlpha || 1);
        if (animateType == "flowline") {
            /* if (!style.image) {
                console.log("动态材质，缺少纹理图片");
                return color;
            }
            material = new animate.FlowLine({
                color: color, // 默认颜色
                image: style.image,
                duration: style.duration || 5000
            }) */
        } else if (animateType == "flyline") {
            /* if (!style.image) {
                console.log("动态材质，缺少纹理图片");
                return color;
            }
            material = new animate.FlyLine({ //动画线材质
                color: color,
                duration: style.duration || 3000,
                image: style.image,
                repeat: new Cesium.Cartesian2(1, 1) //平铺
            }) */
        } else {
            material = color;
        }
        return material;
    }

}
export default CreatePolyline;
