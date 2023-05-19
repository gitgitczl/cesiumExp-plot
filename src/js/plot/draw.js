/* 快捷绘制工具 */
import DrawTool from "./drawTool";
const styleList = [
    {
        "name": "点",
        "type": "point",
        "styleType": "point"
    },
    {
        "name": "线",
        "type": "polyline",
        "styleType": "polyline",
        "style": {
            "clampToGround": true,
            "color": "#ffff00"
        }
    },
    {
        "name": "面",
        "type": "polygon",
        "styleType": "polygon",
        "style": {
            "color": "#0000ff",
            "outline": true,
            "outlineColor": "#ff0000",
            "heightReference": 1
        }
    },
    {
        "name": "圆形",
        "type": "circle",
        "styleType": "polygon",
        "style": {
            "color": "#0000ff",
            "colorAlpha": .3,
            "outline": true,
            "outlineColor": "#ff0000",
            "heightReference": 1
        }
    },
    {
        "name": "矩形",
        "type": "rectangle",
        "styleType": "polygon",
        "style": {
            "color": "#0000ff",
            "outline": true,
            "outlineColor": "#ff0000",
            "heightReference": 1
        }
    },
    {
        "name": "图标",
        "type": "billboard",
        "style": {
            "image": "./easy3d/images/plot/start.png",
            "heightReference": 1
        },
        "styleType": "billboard"
    },
    {
        "name": "文字",
        "type": "label",
        "style": {
            "text": "未命名",
            "fillColor": "#fff",
            "outline": false,
            "outlineWidth": 1,
            "outlineColor": "#ff0000",
            "heightReference": 0,
            "showBackground": true,
            "backgroundColor": "#000",
            "scale": 1
        },
        "styleType": "label"
    },
    {
        "name": "动态线",
        "type": "polyline",
        "styleType": "polyline",
        "style": {
            "clampToGround": true,
            "color": "#0EFCDC",
            "animateType": "flowline",
            "duration": 1000,
            "image": "./easy3d/images/texture/glow.png"
        }
    },
    {
        "name": "流动线",
        "type": "polyline",
        "styleType": "polyline",
        "style": {
            "clampToGround": true,
            "color": "#F9F507",
            "animateType": "flowline",
            "duration": 1000,
            "image": "./easy3d/images/texture/water.png"
        }
    }
]

let drawTool = undefined;
let viewer = undefined;
const start = (opt, viewer) => {
    if (!drawTool) {
        viewer = viewer || window.viewer;
        drawTool = new DrawTool(viewer, { canEdit: false });
    }
    let defaultStyle = styleList.filter(item => {
        return item.type == opt.type
    })[0]?.style || {}
    opt.style = Object.assign(defaultStyle, opt.style);
    return drawTool.start(opt);
}

const removeAll = () => {
    if (!drawTool) return;
    drawTool.removeAll();
}

const remove = (entObj) => {
    if (!entObj || !drawTool) return;
    drawTool.removeOne(entObj);
}



export {
    start, removeAll, remove
};