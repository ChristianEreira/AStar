// A* Pathfinding simulation
// Christian Ereira - https://chrise.dev
// Full source - https://github.com/ChristianEreira/AStar

// Get canvas context
const c = document.getElementById('canvas');
const ctx = c.getContext('2d');

const GRID_SIZE = 50;
// Animation progression rate (speed)
const PROG_STEP = 1;

// Fullscreen canvas
c.width = document.body.clientWidth;
c.height = document.body.clientHeight;

// Define initial variables
let scale = 80;
let center = {
    x: scale * GRID_SIZE * 0.5,
    y: scale * GRID_SIZE * 0.5
};
let grid;
let progress;
let pathLine;
let open;
let closed;
let errorDelay;
let start;
let end;
let running;
let drawing = false;
let drawMode = 'brush';
let moving = false;
let startMove = {
    x: 0,
    y: 0,
    center: {
        x: 0,
        y: 0
    }
};

// Get elements from DOM
let brushBtn = document.getElementById('brush');
let eraserBtn = document.getElementById('eraser');
let startBtn = document.getElementById('start');
let endBtn = document.getElementById('end');
let runBtn = document.getElementById('run');
let clearBtn = document.getElementById('clear');
let resetBtn = document.getElementById('reset');
let speedRange = document.getElementById('speed');
let speedDiv = document.getElementById('speedDiv');
let instantBox = document.getElementById('instant');
let diagBox = document.getElementById('diag');
let errorBox = document.getElementById('errorBox');

/**
 * Reset variables and initalise grids
 */
function reset() {
    // Clear variables
    grid = [];
    progress = [];
    open = [];
    closed = [];
    pathLine = [];
    let row = [];
    let row2 = [];
    running = false;
    // Place start/end at corners
    start = {
        x: 0,
        y: 0
    };
    end = {
        x: GRID_SIZE - 1,
        y: GRID_SIZE - 1
    };
    // Initialise grid and progress arrays
    for (let i = 0; i < GRID_SIZE; i++) {
        row = [];
        row2 = [];
        for (let j = 0; j < GRID_SIZE; j++) {
            row.push('null');
            row2.push(0);
        }
        grid.push(row);
        progress.push(row2);
    }
}

/**
 * Returns the x coordinate on the canvas of a given grid x coordinate
 */
function relx(x) {
    return x * scale + c.width / 2 - center.x;
}

/**
 * Returns the y coordinate on the canvas of a given grid y coordinate
 */
function rely(y) {
    return y * scale + c.height / 2 - center.y;
}

/**
 * Fills specified text onto the canvas with given properties
 */
function drawText(text, x, y, color, txtSize, baseline) {
    ctx.fillStyle = color;
    ctx.font = txtSize * scale + 'px Arial';
    ctx.textBaseline = baseline;
    ctx.fillText(text, x, y);
}

/**
 * Places/erases a wall at a given canvas position based on the current draw mode
 */
function drawWall(mouseX, mouseY) {
    // Get grid position at mouse position
    let x = Math.floor((mouseX + center.x - c.width / 2) / scale);
    let y = Math.floor((mouseY + center.y - c.height / 2) / scale);
    // If mouse is over valid cell...
    if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE && !(x === start.x && y === start.y) && !(x === end.x && y === end.y)) {
        switch (drawMode) {
            case 'start':
                start.x = x;
                start.y = y;
                grid[x][y] = 'null';
                break;
            case 'end':
                end.x = x;
                end.y = y;
                grid[x][y] = 'null';
                break;
            case 'brush':
                if (grid[x][y] !== 'wall') {
                    // Begin grow animation
                    progress[x][y] = PROG_STEP;
                    grid[x][y] = 'wall';
                }
                break;
            default:
                if (grid[x][y] !== 'null') {
                    // Begin shrink animation
                    progress[x][y] = PROG_STEP - 10;
                    grid[x][y] = 'null';
                }
                break;
        }
    }
}

/**
 * Displays an error message with text t
 */
function error(t) {
    // Set error box text
    errorBox.lastElementChild.innerHTML = t;
    errorBox.classList.remove('trans');
    // Hide after 3 seconds
    errorDelay = setTimeout(() => {
        errorBox.classList.add('trans');
    }, 3000);
}

/**
 * Returns the distance between two points
 */
function dist(ax, ay, bx, by) {
    return Math.sqrt(Math.pow(ax - bx, 2) + Math.pow(ay - by, 2));
}

/**
 * Returns a copy of an object
 */
function copy(obj) {
    return JSON.parse(JSON.stringify(obj));
}

/**
 * Compares two cells
 * 
 * Returns 1 if a values are greater. 
 * Returns -1 if b values are greater. 
 * Returns 0 if values are identical.
 */
function compareCells(a, b) {
    if (a.f > b.f) {
        return 1;
    } else if (a.f < b.f) {
        return -1;
    } else if (a.h > b.h) {
        return 1;
    } else if (a.h < b.h) {
        return -1;
    } else {
        return 0;
    }
}

/**
 * Runs the main canvas drawing loop
 */
function loop() {
    // Clear canvas
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.strokeStyle = '#333';
    ctx.lineWidth = '1';

    ctx.beginPath();
    for (let x = 0; x < GRID_SIZE; x++) {
        for (let y = 0; y < GRID_SIZE; y++) {
            // Draw grid outline
            ctx.rect(relx(x), rely(y), scale, scale);
            // Get current cell from open/closed array
            inOpen = open.filter(i => i.x === x && i.y === y);
            inClosed = closed.filter(i => i.x === x && i.y === y);
            if (x === start.x && y === start.y) {
                ctx.fillStyle = '#0F0';
                ctx.fillRect(relx(x), rely(y), scale, scale);
                if (scale > 60) {
                    drawText('Start', relx(x) + (scale / 15), rely(y + 1), '#000', 0.3, 'bottom');
                }
            } else if (x === end.x && y === end.y) {
                ctx.fillStyle = '#F00';
                ctx.fillRect(relx(x), rely(y), scale, scale);
                if (scale > 60) {
                    drawText('End', relx(x) + (scale / 15), rely(y + 1), '#FFF', 0.3, 'bottom');
                }
            } else if (grid[x][y] === 'path') {
                ctx.fillStyle = '#009FFF';
                ctx.fillRect(relx(x), rely(y), scale, scale);
                if (scale > 60) {
                    drawText(+inClosed[0].f.toFixed(1), relx(x) + (scale / 15), rely(y + 1), '#FFF', 0.4, 'bottom');
                    drawText(+inClosed[0].g.toFixed(1), relx(x) + (scale / 15), rely(y) + (scale / 15), '#FFF', 0.25, 'top');
                    drawText(+inClosed[0].h.toFixed(1), relx(x) + (scale / 15), rely(y) + (scale / 3), '#FFF', 0.25, 'top');
                }
            } else if (grid[x][y] === 'wall') {
                ctx.fillStyle = '#333';
                // Get size as a value between 1 and 0
                let size = progress[x][y] / 10;
                // Draw cell at its current size
                ctx.fillRect(relx(x) + (scale / 2 * (1 - size)), rely(y) + (scale / 2 * (1 - size)), scale * size, scale * size);
                // Increment animation progress
                if (progress[x][y] > 0 && progress[x][y] !== 10) {
                    progress[x][y] += PROG_STEP;
                }
            } else if (inOpen.length > 0) {
                ctx.fillStyle = 'rgba(0, 255, 0, 0.4)';
                ctx.fillRect(relx(x), rely(y), scale, scale);
                if (scale > 60) {
                    drawText(+inOpen[0].f.toFixed(1), relx(x) + (scale / 15), rely(y + 1), '#000', 0.4, 'bottom');
                    drawText(+inOpen[0].g.toFixed(1), relx(x) + (scale / 15), rely(y) + (scale / 15), '#000', 0.25, 'top');
                    drawText(+inOpen[0].h.toFixed(1), relx(x) + (scale / 15), rely(y) + (scale / 3), '#000', 0.25, 'top');
                }
            } else if (inClosed.length > 0) {
                ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
                ctx.fillRect(relx(x), rely(y), scale, scale);
                if (scale > 60) {
                    drawText(+inClosed[0].f.toFixed(1), relx(x) + (scale / 15), rely(y + 1), '#000', 0.4, 'bottom');
                    drawText(+inClosed[0].g.toFixed(1), relx(x) + (scale / 15), rely(y) + (scale / 15), '#000', 0.25, 'top');
                    drawText(+inClosed[0].h.toFixed(1), relx(x) + (scale / 15), rely(y) + (scale / 3), '#000', 0.25, 'top');
                }
            } else if (progress[x][y] < 0) {
                ctx.fillStyle = '#333';
                // Get size as a value between 1 and 0
                let size = Math.abs(progress[x][y]) / 10;
                // Draw cell at its current size
                ctx.fillRect(relx(x) + (scale / 2 * (1 - size)), rely(y) + (scale / 2 * (1 - size)), scale * size, scale * size);
                // Increment animation progress
                progress[x][y] += PROG_STEP;
            }
        }
    }
    ctx.stroke();

    // Draw final path line
    if (pathLine.length > 1) {
        ctx.strokeStyle = '#0FF';
        ctx.lineWidth = '5';
        ctx.beginPath();
        ctx.moveTo(relx(pathLine[0][0]) + scale / 2, rely(pathLine[0][1]) + scale / 2);
        for (const i of pathLine) {
            ctx.lineTo(relx(i[0]) + scale / 2, rely(i[1]) + scale / 2);
        }
        ctx.stroke();
    }

    window.requestAnimationFrame(loop);
}

reset();
loop();

/**
 * Runs the next iteration of the A* algorithm
 */
function itteratePath(current) {
    // For all cells around current...
    for (let x = current.x - 1; x <= current.x + 1; x++) {
        for (let y = current.y - 1; y <= current.y + 1; y++) {
            // Check if cell is valid (open/empty and on grid)
            if (!((x === current.x && y === current.y) || x < 0 || y < 0 || x >= GRID_SIZE || y >= GRID_SIZE || grid[x][y] === 'wall' || closed.filter(i => i.x === x && i.y === y).length > 0)) {
                // Handle diagonals
                if (!diagBox.checked && x === current.x - 1 && y === current.y - 1 && grid[x][y + 1] === 'wall' && grid[x + 1][y] === 'wall') {
                    continue;
                } else if (!diagBox.checked && x === current.x + 1 && y === current.y + 1 && grid[x][y - 1] === 'wall' && grid[x - 1][y] === 'wall') {
                    continue;
                } else if (!diagBox.checked && x === current.x - 1 && y === current.y + 1 && grid[x][y - 1] === 'wall' && grid[x + 1][y] === 'wall') {
                    continue;
                } else if (!diagBox.checked && x === current.x + 1 && y === current.y - 1 && grid[x][y + 1] === 'wall' && grid[x - 1][y] === 'wall') {
                    continue;
                }

                // Get cost from start node
                let g = current.g + dist(current.x, current.y, x, y);
                // Get heuristic from end node
                let h = dist(x, y, end.x, end.y);
                let f = g + h;

                // Find current node in open array
                let inOpen = open.filter(i => i.x === x && i.y === y);
                if (inOpen.length > 0) {
                    // If current path to node has lower cost, replace it
                    if (compareCells({
                            f: f,
                            h: h
                        }, inOpen[0]) === -1) {
                        open = open.filter(i => i.x !== x || i.y !== y);
                        open.push({
                            x: x,
                            y: y,
                            g: g,
                            h: h,
                            f: f,
                            parent: {
                                x: current.x,
                                y: current.y
                            }
                        })
                    }
                } else {
                    // Add node to open
                    open.push({
                        x: x,
                        y: y,
                        g: g,
                        h: h,
                        f: f,
                        parent: {
                            x: current.x,
                            y: current.y
                        }
                    })
                }
            }
        }
    }
}

/**
 * Finds the final path from the A* result
 */
function getPath(noPath) {
    if (noPath) {
        error('No valid path');
        resetBtn.onclick();
    } else {
        // Find the path taken
        let pathFound = false;
        // Start at end node
        let current = {
            x: end.x,
            y: end.y
        };
        while (!pathFound) {
            // Add current to path
            grid[current.x][current.y] = 'path';
            pathLine.push([current.x, current.y]);

            if (current.x === start.x && current.y === start.y) {
                pathFound = true;
            } else {
                // Get parent of current
                let obj = closed.filter(i => i.x === current.x && i.y === current.y)[0];
                current.x = obj.parent.x;
                current.y = obj.parent.y;
            }
        }

        clearBtn.classList.remove('dis');
        resetBtn.classList.remove('dis');
    }
}

resetBtn.onclick = e => {
    // Remove path cells
    for (let x = 0; x < GRID_SIZE; x++) {
        for (let y = 0; y < GRID_SIZE; y++) {
            if (grid[x][y] === 'path') {
                grid[x][y] = 'null';
            }
        }
    }
    open = [];
    closed = [];
    pathLine = [];
    resetBtn.classList.add('dis');
    runBtn.classList.remove('dis');
    clearBtn.classList.remove('dis');
    running = false;
}

runBtn.onclick = e => {
    running = true;
    clearBtn.classList.add('dis');
    runBtn.classList.add('dis');
    open = [];
    closed = [];
    // Add start node to open
    open.push({
        x: start.x,
        y: start.y,
        g: 0,
        h: dist(start.x, start.y, end.x, end.y),
        f: dist(start.x, start.y, end.x, end.y),
        parent: null
    });
    let noPath = false;
    let current;

    if (instantBox.checked) {
        let found = false;
        while (!found) {
            if (open.length === 0) {
                // No more cells to check; no path
                noPath = true;
            } else {
                // Get node with least cost
                open.sort(compareCells);
                current = copy(open[0]);
                // Remove from open
                open = open.filter(i => i.x !== current.x || i.y !== current.y);
                // Add to closed
                closed.push(copy(current));
            }

            if (noPath || (current.x === end.x && current.y === end.y)) {
                getPath(noPath);
                found = true;
            } else {
                itteratePath(current);
            }
        }
    } else {
        function run() {
            if (open.length === 0) {
                // No more cells to check; no path
                noPath = true;
            } else {
                // Get node with least cost
                open.sort(compareCells);
                current = copy(open[0]);
                // Remove from open
                open = open.filter(i => i.x !== current.x || i.y !== current.y);
                // Add to closed
                closed.push(copy(current));
            }

            if (noPath || (current.x === end.x && current.y === end.y)) {
                getPath(noPath);
            } else {
                itteratePath(current);
                setTimeout(run, 4 * (100 - speedRange.value));
            }
        }
        run();
    }
}

document.body.onresize = e => {
    // Ensure canvas fills screen
    c.width = document.body.clientWidth;
    c.height = document.body.clientHeight;
}

window.onload = (e) => {
    // Ensure canvas fills screen
    c.width = document.body.clientWidth;
    c.height = document.body.clientHeight;
}

document.onkeypress = function (e) {
    e = e || window.event;
    switch (e.key) {
        case '-':
            // Zoom out while keeping min and max
            scale = Math.min(Math.max(10, scale * 0.8), 180);
            center.x *= 0.8;
            center.y *= 0.8;
            break;
        case '=':
        case '+':
            // Zoom in while keeping min and max
            scale = Math.min(Math.max(10, scale * 1.2), 180);
            center.x *= 1.2;
            center.y *= 1.2;
            break;
        default:
            break;
    }
};

c.onwheel = e => {
    e.preventDefault();
    // Zoom with scroll wheel
    let newScale = scale + e.deltaY * -0.05;
    newScale = Math.max(10, Math.min(180, newScale));
    let tmpScale = scale;
    scale = newScale;
    center.x *= scale / tmpScale;
    center.y *= scale / tmpScale;
}

// Prevent right click menu
c.oncontextmenu = e => {
    e.preventDefault();
    e.stopPropagation();
}

c.onmousedown = e => {
    // Get mouse position
    let mouseX = e.pageX - c.offsetLeft;
    let mouseY = e.pageY - c.offsetTop;
    e.preventDefault();

    if (e.button === 2) {
        // Move with right click
        moving = true;
        startMove.x = mouseX;
        startMove.y = mouseY;
        startMove.center.x = center.x;
        startMove.center.y = center.y;
        c.style.cursor = 'move';
    } else {
        // Draw with left click
        if (!running) {
            c.style.cursor = 'pointer';
            drawing = true;
            drawWall(mouseX, mouseY);
        }
    }
}

c.onmousemove = e => {
    let mouseX = e.pageX - c.offsetLeft;
    let mouseY = e.pageY - c.offsetTop;
    if (moving) {
        center.x = startMove.center.x - (mouseX - startMove.x);
        center.y = startMove.center.y - (mouseY - startMove.y);
    } else if (drawing && !running) {
        drawWall(mouseX, mouseY);
    }
}

c.onmouseup = e => {
    drawing = false;
    moving = false;
    c.style.cursor = 'default';
}

c.onmouseleave = e => {
    drawing = false;
    moving = false;
    c.style.cursor = 'default';
}

brushBtn.onclick = e => {
    drawMode = 'brush';
    brushBtn.classList.add('pressed');
    eraserBtn.classList.remove('pressed');
    startBtn.classList.remove('pressed');
    endBtn.classList.remove('pressed');
}

eraserBtn.onclick = e => {
    drawMode = 'erase';
    brushBtn.classList.remove('pressed');
    eraserBtn.classList.add('pressed');
    startBtn.classList.remove('pressed');
    endBtn.classList.remove('pressed');
}

startBtn.onclick = e => {
    drawMode = 'start';
    brushBtn.classList.remove('pressed');
    eraserBtn.classList.remove('pressed');
    startBtn.classList.add('pressed');
    endBtn.classList.remove('pressed');
}

endBtn.onclick = e => {
    drawMode = 'end';
    brushBtn.classList.remove('pressed');
    eraserBtn.classList.remove('pressed');
    startBtn.classList.remove('pressed');
    endBtn.classList.add('pressed');
}

clearBtn.onclick = e => {
    runBtn.classList.remove('dis');
    resetBtn.classList.add('dis');
    running = false;
    reset();
}

instantBox.onchange = e => {
    if (instantBox.checked) {
        speedDiv.classList.add('dis');
    } else {
        speedDiv.classList.remove('dis');
    }
}