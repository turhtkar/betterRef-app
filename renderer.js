const interact = require('interactjs');
const { ipcRenderer } = require('electron');
const { webFrame } = require('electron');

// Get the body element
let body = document.body;

let zoomFactor = 1; // Keep track of the zoom level
let scale = 1;
let offsetX = 0;
let offsetY = 0;
var newMouseX = 0;
var newMouseY = 0;
var lastTransform = {left: 0, top: 0};
var pointX = 0, pointY = 0;
const lastZoomPoint = {left: 0, top: 0};

let zIndex = 0;
let load = 0;
let lastPos = {left: 0, top: 0, right: 0, bottom: 0}
let pos = {left: 0, top: 0, right: 0, bottom: 0};


//Drag and drop img files into the application window to use them
window.onload = function() {
    let dropZone = document.getElementById('drop_zone');

    dropZone.ondragover = (event) => {
        event.preventDefault();
        return false;
    };

    dropZone.ondrop = (event) => {
        event.preventDefault();
        let refGrid = document.createElement('div');
        refGrid.id = 'grid-snap';
        document.body.appendChild(refGrid);

        for (let f of event.dataTransfer.files) {
            if (f.type.startsWith('video/')) {
                console.log('video');
                let video = document.createElement('video');
                video.src = f.path;
                video.width = 320;
                video.autoplay = true;
                video.loop = true;
                video.muted = true;
                video.className = 'draggable';
                video.style.top = ' 0 px';
                video.style.objectFit = 'fill';
                refGrid.appendChild(video);
            }
            else if (f.type.startsWith('image/')) {
                console.log('File(s) you dragged here: ', f.path);
                let img = document.createElement("img");
                img.src = f.path;
                img.className = "draggable";
                img.style.top = '0 px';
                refGrid.appendChild(img);

            }

            // make the new image draggable and resizable
            interact('.draggable')
                .draggable({
                    inertia: true,
                    modifiers: [
                        interact.modifiers.restrictRect({
                            // restriction: 'parent',
                            elementRect: { top: 0, left: 0, bottom: 1, right: 1 },
                            endOnly: true
                        })
                    ],
                    autoScroll: true,
                    listeners: { move: dragMoveListener, end: endDragListener }
                })
                .resizable({
                    edges: { left: true, right: true, bottom: true, top: true },
                    // preserveAspectRatio: false,
                    margin: 10,
                    listeners: { move: resizeMoveListener, end: endResizeListener },
                    modifiers: [
                        interact.modifiers.restrictEdges({
                            outer: 'parent',
                            endOnly: true,
                        }),
                        interact.modifiers.restrictSize({
                            min: { width: 50, height: 50 },
                        }),
                    ],
                    inertia: true,
                });
        }

        // Hide the drop zone
        dropZone.style.display = 'none';
        return false;
    };
}

function dragMoveListener(event) {
    var target = event.target;
    event.target.style.zIndex = 1000;
    if(load===0) {
        var positions = savePositions();
        var draggableItems = document.querySelectorAll('.draggable');
        for(let i = 0; i<draggableItems.length; i++ ) {
            draggableItems[i].style.position = "absolute";
            draggableItems[i].style.transform = 'translate(' + positions[i].x + 'px, ' + positions[i].y + 'px)';
        }
        load++;
    }
    var x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
    var y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;
    if(y>=0 && x>=0){
        target.style.transform = 'translate(' + x + 'px, ' + y + 'px)';
        target.setAttribute('data-x', x);
        target.setAttribute('data-y', y);

    }
}

function endDragListener(event) {
    getOutOfBoundTravel(event);
    resizeCanvas();
    var textEl = event.target.querySelector('p');
    event.target.style.zIndex = zIndex++;
    textEl && (textEl.textContent = 'moved a distance of ' +
        (Math.sqrt(Math.pow(event.pageX - event.x0, 2) +
            Math.pow(event.pageY - event.y0, 2) | 0))
            .toFixed(2) + 'px');
}
function endResizeListener(event) {
    getOutOfBoundTravel(event);
    resizeCanvas();
}

function getOutOfBoundTravel(event) {
    var boundRect = document.getElementById('grid-snap').getBoundingClientRect();
    var targetRect = event.target.getBoundingClientRect();

    lastPos.left = (boundRect.x-targetRect.x);
    lastPos.right = (targetRect.right-boundRect.right);
    lastPos.top = (boundRect.top-targetRect.top);
    lastPos.bottom = (targetRect.bottom-boundRect.bottom);
}

function resizeCanvas() {
    boundRect = document.getElementById('grid-snap').getBoundingClientRect();
    contStyle = document.getElementById('grid-snap').style;
    if (lastPos.right>0) {
        pos.right += lastPos.right;
        contStyle.width = ((boundRect.width + lastPos.right) + 'px');
    }
    if (lastPos.bottom>0) {
        pos.bottom += lastPos.bottom;
        contStyle.height = ((boundRect.height + lastPos.bottom) + 'px');
    }
    lastPos.bottom = 0;
    lastPos.right = 0;
}

function resizeMoveListener(event) {
    let { target, rect } = event;

    if(load===0) {
        var positions = savePositions();
        var draggableItems = document.querySelectorAll('.draggable');
        for(let i = 0; i<draggableItems.length; i++ ) {
            draggableItems[i].style.position = "absolute";
            draggableItems[i].style.transform = 'translate(' + positions[i].x + 'px, ' + positions[i].y + 'px)';
        }
        load++;
    }

    let x = (parseFloat(target.getAttribute('data-x')) || 0);
    let y = (parseFloat(target.getAttribute('data-y')) || 0);

    target.style.width = rect.width + 'px';
    target.style.height = rect.height + 'px';
    target.style.top = "0px";

    x += event.deltaRect.left;
    y += event.deltaRect.top;

    target.style.transform = 'translate(' + x + 'px,' + y + 'px)';
    target.setAttribute('data-x', x);
    target.setAttribute('data-y', y);
}

interact('.draggable').on('tap', function (event) {
    let target = event.currentTarget;
    // Hide the bounding box for any previous selected element
    let previousSelected = document.querySelector('.selected');
    if (previousSelected) {
        previousSelected.classList.remove('selected');
    }

    // Show the bounding box for the new selected element
    target.classList.add('selected');
    updateBoundingBox(target);
    event.preventDefault();
});

interact('body').on('click', function(event) {
    // if the clicked element is not an image, hide the bounding box
    if (event.target.className !== 'draggable') {
        let previousSelected = document.querySelector('.selected');
        if (previousSelected) {
            previousSelected.classList.remove('selected');
            let boundingBox = document.getElementById('boundingBox');
            boundingBox.style.display = 'none';
        }
    }
});

function updateBoundingBox(element) {
    let boundingBox = document.getElementById('boundingBox');
    let rect = element.getBoundingClientRect();

    boundingBox.style.width = rect.width + 'px';
    boundingBox.style.height = rect.height + 'px';
    boundingBox.style.left = rect.left + 'px';
    boundingBox.style.top = rect.top + 'px';
    boundingBox.style.display = 'block';
}

function savePositions() {
    let positions = [];
    let width = window.getComputedStyle(document.getElementById('grid-snap'), null).getPropertyValue('width');
    let height = window.getComputedStyle(document.getElementById('grid-snap'), null).getPropertyValue('height');
    console.log(height);
    document.getElementById('grid-snap').style.height = height;
    document.getElementById('grid-snap').style.width = width;
    draggableItems = document.querySelectorAll('.draggable');
    let contReact = document.getElementById('grid-snap').getBoundingClientRect()
    var i=0;
    draggableItems.forEach(item => {
        let rect = item.getBoundingClientRect();
        let position = {
            id: i++,
            x: (rect.left - contReact.left),
            y: (rect.top - contReact.top),
        };
        positions.push(position);
        item.setAttribute('id', position.id);
        item.setAttribute('data-x', (rect.left - contReact.left));
        item.setAttribute('data-y', (rect.top - contReact.top));
    });
    console.log(positions);
    return positions;
}


  // Create a new draggable text box
function createNewNote() {
    // const textbox = document.createElement('div');
    // textbox.className = 'draggable textboxContainer';
    const textarea = document.createElement('textarea');
    textarea.className = 'draggable textbox';
    const closeButton = document.createElement('button');
    closeButton.className = 'close-button';
    closeButton.textContent = 'x';
    textarea.appendChild(closeButton);
    document.getElementById('grid-snap').appendChild(textarea);
    // Make the new text box draggable
    interact('.draggable')
      .draggable({
        inertia: true,
        modifiers: [
            interact.modifiers.restrictRect({
            restriction: 'parent',
            endOnly: true
            })
        ],
        autoScroll: true,
        listeners: { move: dragMoveListener, end: endDragListener }
      })
      .resizable({
        edges: { left: true, right: true, bottom: true, top: true },
        // preserveAspectRatio: false,
        margin: 10,
        listeners: { move: resizeMoveListener },
        modifiers: [
            interact.modifiers.restrictEdges({
                outer: 'parent',
                endOnly: true,
            }),
            interact.modifiers.restrictSize({
                min: { width: 50, height: 50 },
            }),
        ],
        inertia: true,
    });
}
  
// Listen for the 'create-new-note' event
ipcRenderer.on('create-new-note', createNewNote);


window.addEventListener('mouseup', function(e) {
    if(e.button === 1) { // Middle mouse button
        isPanning = false;
    }
});

// panning tool
let isPanning = false;
let start = { x: 0, y: 0 };
let scrollPos = { x: 0, y: 0 };

window.addEventListener('mousedown', function(e) {
    if(e.button === 1) { // Middle mouse button
        isPanning = true;
        start = { x: e.clientX - pointX, y: e.clientY - pointY };
        // scrollPos = { x: window.scrollX, y: window.scrollY };
    }
});

window.addEventListener('mousemove', function(e) {
    if(isPanning) {
        const dx = e.clientX - start.x;
        const dy = e.clientY - start.y;
        pointX = dx;
        pointY = dy;
        // window.scrollTo(scrollPos.x - dx, scrollPos.y - dy);
        setTransform();
    }
});

window.addEventListener('mouseup', function(e) {
    if(e.button === 1) { // Middle mouse button
        isPanning = false;
    }
});

function setTransform() {
    document.documentElement.style.transform = "translate(" + pointX + "px, " + pointY + "px) scale(" + scale + ")";
    savePositions();
  }

// window.onmousedown = function(e) {
//     e.preventDefault();
//     start = {x: e.clientX - pointX, y: e.clientY-pointY};
//     panning = true;
// }

window.addEventListener('wheel', (event)=> {
    event.preventDefault();
    console.log('the point of the mouse before is - '+ event.clientX + ', ' + event.clientY);
    //lastZoomPoint = {left: event.clientX, top: event.clientY};
    if(scale===1) {
        lastZoomPoint.left = event.clientX;
        lastZoomPoint.top = event.clientY;
    }
    var cont = document.getElementById('grid-snap')
    const lastPositions = savePositions();
    const mouseX = event.clientX - cont.offsetLeft;
    const mouseY = event.clientY - cont.offsetTop;
    // console.log('\n\n this is the offset top')
    // console.log(cont.offsetTop);
    // console.log('\n\n this is the mouseY')
    // console.log(mouseY);

    
    // Apply the new scale while keeping the mouse position fixed
    if(scale!==1) {
        // lastZoomPoint.left = event.clientX;
        // lastZoomPoint.top = event.clientY;
    //     if(event.deltaY < 0) {
    //         if(!(event.clientX === lastZoomPoint.left)) {
    //             console.log('error \n\n');
    //             newMouseX = mouseX*1.24;
    //         }
    //         if(!(event.clientY === lastZoomPoint.top)) {
    //             newMouseY = mouseY*1.24;
    //         }
    //     }else {
    //         if(!(event.clientX === lastZoomPoint.left)) {
    //             newMouseX = mouseX/1.24;
    //         }
    //         if(!(event.clientY === lastZoomPoint.top)) {
    //             newMouseY = mouseY/1.24;
    //         }
    //     }
    //     if((event.clientX === lastZoomPoint.left) && (event.clientY === lastZoomPoint.top)) {
    //         cont.style.transformOrigin = `${mouseX}px ${mouseY}px`;
    //     }else {
    //         cont.style.transformOrigin = `${newMouseX}px ${newMouseY}px`;
    //         lastZoomPoint.left = event.clientX;
    //         lastZoomPoint.top = event.clientY;
    //     }
    // }else {
        //     cont.style.transformOrigin = `${mouseX}px ${mouseY}px`;
    }
    if(!(event.clientX === lastZoomPoint.left)) {
        var distanceX = (event.clientX-lastZoomPoint.left);
    }
    if(!(event.clientY === lastZoomPoint.top)) {
        var distanceY = (event.clientY-lastZoomPoint.top);
    }
    if((event.clientX !== lastZoomPoint.left) || (event.clientY !== lastZoomPoint.top)) {
        // cont.style.transformOrigin = `${(lastTransform.left+distanceX)}px ${mouseY}px`;
        console.log('this is The distance in x, y\n' + distanceX + ', ' + distanceY);
        lastZoomPoint.left = event.clientX;
        lastZoomPoint.top = event.clientY;
    }

    // Calculate the new scale
    if (event.deltaY < 0) {
      // Zoom in
      scale *= 1.24;
    } else {
      // Zoom out
      scale /= 1.24;
    }

    cont.style.transformOrigin = `${mouseX}px ${mouseY}px`;
    cont.style.transform = `scale(${scale})`;
    lastTransform.left = mouseX;
    lastTransform.top = mouseY;
    savePositions();
    console.log('the point of the mouse after is - '+ event.clientX + ', ' + event.clientY);
    // if(e.ctrlKey) {
    // }
});

// Add the 'wheel' event listener
// window.addEventListener('wheel', (event) => {
//     if (event.ctrlKey) {
//         event.preventDefault(); // Prevent the default scroll behavior
//         const scaleFactor = 1.24; // Based on measures
//         const mouseXPercentage = event.clientX / window.innerWidth;
//         const mouseYPercentage = event.clientY / window.innerHeight;
    
//         // Determine if we are zooming in or out
//         if (event.deltaY < 0) {
//             scale *= scaleFactor;
//             originX = mouseXPercentage * 100;
//             originY = mouseYPercentage * 100;
//         } else {
//             scale /= scaleFactor;
//         }
    
//         // Apply the transformations
//         document.documentElement.style.transformOrigin = `${originX}% ${originY}%`;
//         document.documentElement.style.transform = `scale(${scale})`;
//     }
// });
