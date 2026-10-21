const canvas = document.querySelector("canvas"),
toolBtns = document.querySelectorAll(".tool"),
fillColor = document.querySelector("#fill-color"),
sizeSlider = document.querySelector("#size-slider"),
sizeValue = document.querySelector("#size-value"),
colorBtns = document.querySelectorAll(".colors .option"),
colorPicker = document.querySelector("#color-picker"),
clearCanvas = document.querySelector(".clear-canvas"),
saveImg = document.querySelector(".save-img"),
undoBtn = document.querySelector(".undo"),
redoBtn = document.querySelector(".redo"),
ctx = canvas.getContext("2d", { willReadFrequently: true });

const MAX_HISTORY = 30;
let prevX, prevY, snapshot,
isDrawing = false,
selectedTool = "brush",
brushWidth = 5,
selectedColor = "#000000",
undoStack = [],
redoStack = [];

const setCanvasBackground = () => {
    ctx.fillStyle = "#fff"; // white background so exported images are not transparent
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = selectedColor;
}

const updateHistoryButtons = () => {
    undoBtn.disabled = undoStack.length === 0;
    redoBtn.disabled = redoStack.length === 0;
}

const saveState = () => {
    undoStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    if(undoStack.length > MAX_HISTORY) undoStack.shift();
    redoStack = [];
    updateHistoryButtons();
}

const undo = () => {
    if(!undoStack.length) return;
    redoStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    ctx.putImageData(undoStack.pop(), 0, 0);
    updateHistoryButtons();
}

const redo = () => {
    if(!redoStack.length) return;
    undoStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    ctx.putImageData(redoStack.pop(), 0, 0);
    updateHistoryButtons();
}

window.addEventListener("load", () => {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    setCanvasBackground();
});

// Converts pointer position to canvas pixels, even if the canvas is scaled by CSS
const getPos = (e) => {
    const rect = canvas.getBoundingClientRect();
    return {
        x: (e.clientX - rect.left) * (canvas.width / rect.width),
        y: (e.clientY - rect.top) * (canvas.height / rect.height)
    };
}

const drawRect = (x, y) => {
    const w = x - prevX, h = y - prevY;
    fillColor.checked ? ctx.fillRect(prevX, prevY, w, h) : ctx.strokeRect(prevX, prevY, w, h);
}

const drawCircle = (x, y) => {
    ctx.beginPath();
    const radius = Math.hypot(prevX - x, prevY - y);
    ctx.arc(prevX, prevY, radius, 0, 2 * Math.PI);
    fillColor.checked ? ctx.fill() : ctx.stroke();
}

const drawTriangle = (x, y) => {
    ctx.beginPath();
    ctx.moveTo(prevX, prevY);
    ctx.lineTo(x, y);
    ctx.lineTo(prevX * 2 - x, y);
    ctx.closePath();
    fillColor.checked ? ctx.fill() : ctx.stroke();
}

const drawLine = (x, y) => {
    ctx.beginPath();
    ctx.moveTo(prevX, prevY);
    ctx.lineTo(x, y);
    ctx.stroke();
}

const startDraw = (e) => {
    if(e.button !== undefined && e.button !== 0) return; // left button / touch / pen only
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    saveState(); // so this stroke can be undone
    isDrawing = true;
    const { x, y } = getPos(e);
    prevX = x;
    prevY = y;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = brushWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = selectedTool === "eraser" ? "#fff" : selectedColor;
    ctx.fillStyle = selectedColor;
    snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
    if(selectedTool === "brush" || selectedTool === "eraser") {
        // a single click or tap leaves a dot
        ctx.lineTo(x + 0.01, y);
        ctx.stroke();
    }
}

const drawing = (e) => {
    if(!isDrawing) return;
    e.preventDefault();
    const { x, y } = getPos(e);
    if(selectedTool === "brush" || selectedTool === "eraser") {
        ctx.lineTo(x, y);
        ctx.stroke();
        return;
    }
    ctx.putImageData(snapshot, 0, 0); // redraw preview of the shape from the saved snapshot
    if(selectedTool === "rectangle") drawRect(x, y);
    else if(selectedTool === "circle") drawCircle(x, y);
    else if(selectedTool === "line") drawLine(x, y);
    else drawTriangle(x, y);
}

const stopDraw = () => { isDrawing = false; }

toolBtns.forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelector(".options .active").classList.remove("active");
        btn.classList.add("active");
        selectedTool = btn.id;
    });
});

sizeSlider.addEventListener("input", () => {
    brushWidth = Number(sizeSlider.value);
    sizeValue.textContent = sizeSlider.value;
});

colorBtns.forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelector(".options .selected").classList.remove("selected");
        btn.classList.add("selected");
        selectedColor = window.getComputedStyle(btn).getPropertyValue("background-color");
    });
});

colorPicker.addEventListener("input", () => {
    colorPicker.parentElement.style.background = colorPicker.value;
    colorPicker.parentElement.click();
});

clearCanvas.addEventListener("click", () => {
    saveState(); // clearing can be undone
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setCanvasBackground();
});

saveImg.addEventListener("click", () => {
    const link = document.createElement("a");
    link.download = `drawing-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
});

undoBtn.addEventListener("click", undo);
redoBtn.addEventListener("click", redo);

document.addEventListener("keydown", (e) => {
    if(!(e.ctrlKey || e.metaKey)) return;
    const k = e.key.toLowerCase();
    if(k === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
    else if(k === "y" || (k === "z" && e.shiftKey)) { e.preventDefault(); redo(); }
});

// Pointer events cover mouse, touch and stylus with one code path
canvas.addEventListener("pointerdown", startDraw);
canvas.addEventListener("pointermove", drawing);
canvas.addEventListener("pointerup", stopDraw);
canvas.addEventListener("pointercancel", stopDraw);
