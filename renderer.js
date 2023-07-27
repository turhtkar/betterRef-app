const interact = require('interactjs');
const { ipcRenderer } = require('electron');
const { webFrame } = require('electron');


let zoomFactor = 1.24; // Keep track of the zoom level
let translation = {x: 0, y: 0};
let scale = 1;
const lastZoomPoint = {left: 0, top: 0};
var centerPoint = {x:0, y:0}
var selectedElement = 0;

let zIndex = 0;
let load = 0;
let lastPos = {left: 0, top: 0, right: 0, bottom: 0}
let pos = {left: 0, top: 0, right: 0, bottom: 0};
var isResize = 0;


//Drag and drop img files into the application window to use them
window.onload = function() {
    
    let dropZone = document.getElementById('drop_zone');
    
    dropZone.ondragover = (event) => {
        event.preventDefault();
        return false;
    };
    // var brHandle = document.querySelector('.handle-br');
    // var curLef = brHandle.getBoundingClientRect();
    // console.log(curLef.left);
    // console.log((curLef.left-16) + 'px');
    // brHandle.style.left = (curLef.left-16) + 'px';

    dropZone.ondrop = (event) => {
        event.preventDefault();
        let refGrid = document.createElement('div');
        let wrapperGrid = document.createElement('div');
        wrapperGrid.className = 'wrapper-grid';
        refGrid.id = 'grid-snap';
        // document.body.appendChild(refGrid);
        wrapperGrid.appendChild(refGrid);
        document.body.appendChild(wrapperGrid);

        let accx = 0, accy = 0;

        refGrid.addEventListener("wheel", (e) => {
            e.preventDefault();
            if (e.deltaY < 0) {
                scale *= 1.24;
                accx += e.offsetX * scale/1.24 - e.offsetX * scale;
                accy += e.offsetY * scale/1.24 - e.offsetY * scale;
            } else {
                scale /= 1.24;
                accx += e.offsetX * scale * 1.24 - e.offsetX * scale;
                accy += e.offsetY * scale * 1.24 - e.offsetY * scale;
            }

            refGrid.style.transformOrigin = "0 0";
            e.target.style.transform = `scale3D(${scale}, ${scale}, ${scale})`
            wrapperGrid.style.transform = `translate(${accx}px, ${accy}px)`;
            if(selectedElement != 0) {
                updateBoundingBox(selectedElement);
            }
            // translation.x = accx;
            // translation.y = accy;
            
            // boundBox = document.querySelector('#boundingBox');
            // if(boundBox.style.display != 'none') {
            //     boundBox.style.transform = 'translate( ' + (translation.x + refGrid.getBoundingClientRect().x)/scale + 'px, ' + (translation.y + refGrid.getBoundingClientRect().y)/scale + 'px)'
            //     boundBox.style.transform = `scale3D(${scale}, ${scale}, ${scale})`
            // }
        });

        for (let f of event.dataTransfer.files) {
        // Create container for each element
        let container = document.createElement('div');
        container.className = 'draggable container';
        container.style.position = 'relative';
        container.style.overflow = 'hidden';

        // Create close button
        let closeButton = document.createElement('button');
        closeButton.className = 'close-button';
        closeButton.textContent = String.fromCodePoint(0x1F534);
        closeButton.style.display = 'none';

        // Add an event listener to handle the close button click
        closeButton.addEventListener('click', function () {
            container.remove(); // Remove the whole container when the button is clicked
        });
        // Append the close button to the container
        container.appendChild(closeButton);

            if (f.type.startsWith('video/')) {
                console.log('video');
                let video = document.createElement('video');
                video.src = f.path;
                video.width = 320;
                video.autoplay = true;
                video.loop = true;
                video.muted = true;
                // video.className = 'draggable';
                video.style.top = ' 0 px';
                video.style.objectFit = 'fill';
                video.style.width = '100%';
                video.style.height = '100%';
                container.appendChild(video);// Append the video to it's container
            }
            else if (f.type.startsWith('image/')) {
                console.log('File(s) you dragged here: ', f.path);
                let img = document.createElement("img");
                img.src = f.path;
                // img.className = "draggable";
                img.style.top = '0 px';
                img.style.width = '100%';
                img.style.height = '100%';
                container.appendChild(img);

            }
            // Append the container to the grid-snap
            refGrid.appendChild(container);

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
                container.addEventListener('click', function(event) {
                    event.stopPropagation();
                    hideAllCloseButtons();
                    let closeButton = this.querySelector('.close-button');
                    selectedElement = 0;
                    if (closeButton) {
                        closeButton.style.display = 'block';
                        selectedElement = event;
                        updateBoundingBox(event);
                        console.log(event.target.getBoundingClientRect());
                    }
                });
            }

        // Hide the drop zone
        dropZone.style.display = 'none';
        return false;
    };
}

// hide close button when click anywhere else on the document
document.addEventListener('click', function(event) {
    var centerGrid = document.getElementById('grid-snap').getBoundingClientRect();
    centerPoint.x = centerGrid.width/2;
    centerPoint.y = centerGrid.height/2;
    console.log('this is the center point - ' + centerPoint.x + ' , ' + centerPoint.y);
    console.log(document.getElementById('grid-snap').getBoundingClientRect());
    hideAllCloseButtons();
});

function hideAllCloseButtons() {
    let closeButtons = document.querySelectorAll('.close-button');
    document.getElementById('boundingBox').style.display='none';
    closeButtons.forEach(function(button) {
        button.style.display = 'none';
    });
}


function dragMoveListener(event) {
    var target = event.target;
    event.target.style.zIndex = 1000;
    if(load===0) {
        console.log('save pos');
        var positions = savePositions();
        var draggableItems = document.querySelectorAll('.draggable');
        for(let i = 0; i<draggableItems.length; i++ ) {
            draggableItems[i].style.position = "absolute";
            draggableItems[i].style.transform = 'translate(' + positions[i].x + 'px, ' + positions[i].y + 'px)';
        }
        load++;
    }
    var x = (parseFloat(target.getAttribute('data-x')) || 0) + (event.dx/scale);
    var y = (parseFloat(target.getAttribute('data-y')) || 0) + (event.dy/scale);
    if(y>=0 && x>=0){
        target.style.transform = 'translate(' + x + 'px, ' + y + 'px)';
        target.setAttribute('data-x', x);
        target.setAttribute('data-y', y);
        translation.x = x;
        translation.y = y;
    }
    getOutOfBoundTravel(event);
    window.requestAnimationFrame(function() {
        resizeCanvas(event);
        updateBoundingBox(event);
    });
}

function endDragListener(event) {
    getOutOfBoundTravel(event);
    window.requestAnimationFrame(function() {
        resizeCanvas(event);
        updateBoundingBox(event);
    });
    // updateBoundingBox(event);
    var textEl = event.target.querySelector('p');
    event.target.style.zIndex = zIndex++;
    textEl && (textEl.textContent = 'moved a distance of ' +
        (Math.sqrt(Math.pow(event.pageX - event.x0, 2) +
            Math.pow(event.pageY - event.y0, 2) | 0))
            .toFixed(2) + 'px');
}
function endResizeListener(event) {
    isResize=0;
    getOutOfBoundTravel(event);
    window.requestAnimationFrame(function() {
        resizeCanvas(event);
        updateBoundingBox(event);
    });
    // updateBoundingBox(event);
}

function getOutOfBoundTravel(event) {
    var boundRect = document.getElementById('grid-snap').getBoundingClientRect();
    var targetRect = event.target.getBoundingClientRect();
    //we divide by scale, since when we zoom in and out, the y and x are also scaled and so to calculate the actual distance overlap we need to divide by the scale
    lastPos.left = (boundRect.x-targetRect.x)/scale;
    lastPos.right = (targetRect.right-boundRect.right)/scale;
    lastPos.top = (boundRect.top-targetRect.top)/scale;
    lastPos.bottom = (targetRect.bottom-boundRect.bottom)/scale;
    console.log(boundRect);
    console.log(targetRect);
}

function resizeCanvas(event) {
    boundRect = document.getElementById('grid-snap').getBoundingClientRect();
    contStyle = document.getElementById('grid-snap').style;
    // boundBox = document.getElementById('boundingBox');
    // var boundBoxX = boundBox.getBoundingClientRect().x;
    // var boundBoxY = boundBox.getBoundingClientRect().y;
    console.log('this is the grid y - ' + boundRect.y);
    if (lastPos.right>0) {
        pos.right += lastPos.right;
        contStyle.width = ((boundRect.width/scale + lastPos.right) + 'px');
    }
    if (lastPos.bottom>0) {
        pos.bottom += lastPos.bottom;
        console.log('this is the distance to grow' + lastPos.bottom);
        console.log('this is the actual height before ' + contStyle.height);
        console.log('this is the calc height before ' + boundRect.height/scale);
        contStyle.height = ((boundRect.height/scale + lastPos.bottom) + 'px');
        //change bounding box y since when we increase the grid width we are also changing the intial y of the boundingBox since
        // it is placed on the same depth level as the wrapper and so it is using the x y cordinate system of the body.
    }
    lastPos.bottom = 0;
    lastPos.right = 0;
    centerPoint.x = boundRect.width/2;
    centerPoint.y = boundRect.height/2;
    document.body.offsetHeight;
    updateBoundingBox(event);
    window.requestAnimationFrame(function() {
        console.log('resize');
    });
    // boundingBox.style.transform = 'translate(' + (boundRect.x + translation.x - 7) + 'px, ' + (boundRect.y + translation.y -7) + 'px)';
    // boundBox.style.transform = 'translate( ' + boundBoxX-7 + 'px , ' + boundBoxY-7 + 'px )';
}

function resizeMoveListener(event) {
    let { target, rect } = event;
    isResize = 1;
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
    
    translation.x = x;
    translation.y = y;

    target.style.transform = 'translate(' + x + 'px,' + y + 'px)';
    target.setAttribute('data-x', x);
    target.setAttribute('data-y', y);
    getOutOfBoundTravel(event);
    window.requestAnimationFrame(function() {
        resizeCanvas(event);
        updateBoundingBox(event);
    });
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
    updateBoundingBox(event);
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
    //get the boundingBox element
    const boundingBox = document.querySelector('#boundingBox');
    var boundWidth = element.target.getBoundingClientRect().width;
    var boundHeight = element.target.getBoundingClientRect().height
    boundingBox.style.display = 'block';
    // get the grid transition to calculate the new transition of the grid
    let gridSnap = document.getElementById('grid-snap').getBoundingClientRect();
    // boundingBox.style.transform = 'translate(' + (gridSnap.x + translation.x - 7)+ 'px, ' + (gridSnap.y + translation.y -7) + 'px)';
    boundingBox.style.left = element.target.getBoundingClientRect().x + 'px';
    boundingBox.style.top = element.target.getBoundingClientRect().y + 'px';
    boundingBox.style.width = (boundWidth-3) + 'px';
    boundingBox.style.height = (boundHeight-3) + 'px';

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


// JavaScript
// Create a new draggable text box
function createNewNote() {
    const textbox = document.createElement('div');
    textbox.className = 'draggable textboxContainer';
    textbox.style.overflow = 'revert';
    textbox.style.position = 'absolute';
    
    const textarea = document.createElement('textarea');
    textarea.className = 'textbox';
    
    const closeButton = document.createElement('button');
    closeButton.className = 'close-button';
    closeButton.textContent = String.fromCodePoint(0x1F534);
    closeButton.style.display = 'none'; // initially, the close button is hidden
    
    closeButton.addEventListener('click', function (event) {
        event.stopPropagation(); // prevent the container click event from firing
        textbox.remove();
    });
  
    textbox.appendChild(closeButton);
    textbox.appendChild(textarea);
    
    document.getElementById('grid-snap').appendChild(textbox);

    textbox.addEventListener('click', function(event) {
        event.stopPropagation(); // prevent the document click event from firing
        hideAllCloseButtons();
        let closeButton = this.querySelector('.close-button');
        if (closeButton) {
            closeButton.style.display = 'block';
        }
    });

    interact('.draggable')
        .draggable({
            inertia: true,
            modifiers: [
                interact.modifiers.restrictRect({
                    elementRect: { top: 0, left: 0, bottom: 1, right: 1 },
                    endOnly: true
                })
            ],
            autoScroll: true,
            listeners: { move: dragMoveListener, end: endDragListener }
        })
        .resizable({
            edges: { left: true, right: true, bottom: true, top: true },
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

document.addEventListener('click', function(event) {
    hideAllCloseButtons();
});

function hideAllCloseButtons() {
    let closeButtons = document.querySelectorAll('.close-button');
    closeButtons.forEach(function(button) {
        button.style.display = 'none';
    });
}

  
// Listen for the 'create-new-note' event
ipcRenderer.on('create-new-note', createNewNote);

function moveBoundingBox(event) {
    //get the boundingBox element
    const boundingBox = document.querySelector('#boundingBox');
    var boundWidth = event.getBoundingClientRect().width;
    var boundHeight = event.getBoundingClientRect().height
    // get the grid transition to calculate the new transition of the grid
    const style = window.getComputedStyle(gridSnap);
    const matrix = style.transform || style.webkitTransform || style.mozTransform;
    
    // Can either be 2d or 3d transform
    const matrixType = matrix.includes('3d') ? '3d' : '2d'
    const matrixValues = matrix.match(/matrix.*\((.+)\)/)[1].split(', ');
    if (matrixType === '2d') {
        const x = parseFloat(matrixValues[4]);
        const y = parseFloat(matrixValues[5]);
        boundingBox.style.transform = 'translate(' + (style.left + x) + 'px, ' + (style.top) + 'px)';
        console.log('translate(' + (style.left + x) + 'px, ' + (style.top) + 'px)');
    }
    if(isResize===1) {
        boundingBox.style.width = boundWidth + 'px';
        boundingBox.style.height = boundHeight + 'px';
    }


    //get the boundingBoxHandles
    
}

// const closeButton = document.querySelector('.close-button');
// noteContainer.textarea.addEventListener('focusin', function() {
//     noteContainer.firstChild.style.display('block');
// });

// noteContainer.textarea.addEventListener('focusout', function() {
//     noteContainer.firstChild.style.display('none');
// });


// document.addEventListener('click', (event) => {
//     var target = event.target;
//     console.log('this is ' + target);
//     // target.style.transform = 'scale(4)';
//     // selectedElement = target;
// });


// window.addEventListener('mouseup', function(e) {
//     if(e.button === 1) { // Middle mouse button
//         isPanning = false;
//     }
// });

// // panning tool
// let isPanning = false;
// let start = { x: 0, y: 0 };
// let scrollPos = { x: 0, y: 0 };

// window.addEventListener('mousedown', function(e) {
//     if(e.button === 1) { // Middle mouse button
//         isPanning = true;
//         start = { x: e.clientX - pointX, y: e.clientY - pointY };
//         // scrollPos = { x: window.scrollX, y: window.scrollY };
//     }
// });

// window.addEventListener('mousemove', function(e) {
//     if(isPanning) {
//         const dx = e.clientX - start.x;
//         const dy = e.clientY - start.y;
//         pointX = dx;
//         pointY = dy;
//         // window.scrollTo(scrollPos.x - dx, scrollPos.y - dy);
//         setTransform();
//     }
// });

// window.addEventListener('mouseup', function(e) {
//     if(e.button === 1) { // Middle mouse button
//         isPanning = false;
//     }
// });


// Attach wheel event listener
// let gridWrapper = document.body.querySelector('.wrapper-grid');
// gridWrapper.querySelector('#grid-snap').addEventListener('wheel', (event)=> {
//     let cont = document.getElementById('grid-snap');
//     let accx = 0, accy = 0;
//     event.preventDefault();
//     const mouseX = event.clientX - cont.offsetLeft;
//     const mouseY = event.clientY - cont.offsetTop;

//     if (event.deltaY < 0) {
//       // Zoom in
//       scale *= 1.24;
//       accx += (event.offsetX * scale/1.24 - event.offsetX * scale);
//       accy += (event.offsetY * scale/1.24 - event.offsetY * scale);
//     } else {
//       // Zoom out
//       scale /= 1.24;
//       accx += (event.offsetX * scale * 1.24 - event.offsetX * scale);
//       accy += (event.offsetY * scale * 1.24 - event.offsetY * scale);
//     }

//     cont.style.transformOrigin = `0 0`; // Top-left
//     event.target.style.transform = `scale3D(${scale}, ${scale}, ${scale})`;
//     gridWrapper.style.transform = `translate(${accx}px, ${accy}px)`;
// });


// document.addEventListener('wheel', function(event) {
//     // Prevent the default browser action
//     event.preventDefault();
//     console.log('hi');
//     let gridSnap = document.getElementById('grid-snap');
//     // Get the mouse position at the time of the wheel event
//     var mouseX = event.clientX - gridSnap.offsetLeft;
//     var mouseY = event.clientY - gridSnap.offsetTop;
//     var newMouseX=0;
//     var newMouseY=0;
//     console.log('this is the mouse x, y at zoom' + mouseX + ' , ' + mouseY);

//     // Determine whether the wheel was scrolled up or down
//     if (event.deltaY < 0) {
//         // Wheel scrolled up, zoom in
//         scale *= zoomFactor;
//         // get where the mouse is supposed to be after scale
//         newMouseX = mouseX*scale;
//         newMouseY = mouseY*scale
//         console.log('this is the new mouse pose ' + newMouseX + ' , ' + newMouseY);
//     } else {
//         // Wheel scrolled down, zoom out
//         scale /= zoomFactor;
//         // get where the mouse is supposed to be after scale
//         newMouseX = mouseX/scale;
//         newMouseY = mouseY/scale;        
//     }
//     console.log('this is the new mouse pose ' + newMouseX + ' , ' + newMouseY);
//     //calculate the distance between the mouse pos to the new expected mouse pos after scale
//     var disX = Math.round(newMouseX - mouseX);
//     var disY = Math.round(newMouseY - mouseY);
//     console.log('this is the distance betweent the new expected mouse pos - ' + disX + ' , ' + disY);

//     // get the grid transition to calculate the new transition of the grid
//     const style = window.getComputedStyle(gridSnap);
//     const matrix = style.transform || style.webkitTransform || style.mozTransform;
    
//     // Can either be 2d or 3d transform
//     const matrixType = matrix.includes('3d') ? '3d' : '2d'
//     const matrixValues = matrix.match(/matrix.*\((.+)\)/)[1].split(', ');
//     if (matrixType === '2d') {
//         const x = parseFloat(matrixValues[4]);
//         const y = parseFloat(matrixValues[5]);
//         var translateX = (x - disX);
//         var translateY = (y - disY);
//         console.log('this is the transform translate x, y - ' + translateX + ' , ' + translateY);
//     }
//     if(gridSnap.style.transform) {
//         // var newTranslate = {x: ()}
//     }

//     // Apply the scale and translation
//     gridSnap.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
// }); // The 'passive' option needs to be false in order to call preventDefault()


// window.addEventListener('wheel', (event)=> {
//     event.preventDefault();
//     console.log('the point of the mouse before is - '+ event.clientX + ', ' + event.clientY);
//     //lastZoomPoint = {left: event.clientX, top: event.clientY};
//     if(scale===1) {
//         lastZoomPoint.left = event.clientX;
//         lastZoomPoint.top = event.clientY;
//     }
//     var cont = document.getElementById('grid-snap')
//     const lastPositions = savePositions();
//     const mouseX = event.clientX - cont.offsetLeft;
//     const mouseY = event.clientY - cont.offsetTop;

//     if(!(event.clientX === lastZoomPoint.left)) {
//         var distanceX = (event.clientX-lastZoomPoint.left);
//     }
//     if(!(event.clientY === lastZoomPoint.top)) {
//         var distanceY = (event.clientY-lastZoomPoint.top);
//     }
//     if((event.clientX !== lastZoomPoint.left) || (event.clientY !== lastZoomPoint.top)) {
//         // cont.style.transformOrigin = `${(lastTransform.left+distanceX)}px ${mouseY}px`;
//         console.log('this is The distance in x, y\n' + distanceX + ', ' + distanceY);
//         lastZoomPoint.left = event.clientX;
//         lastZoomPoint.top = event.clientY;
//     }

//     // Calculate the new scale
//     if (event.deltaY < 0) {
//       // Zoom in
//       scale *= 1.24;
//     } else {
//       // Zoom out
//       scale /= 1.24;
//     }

//     // cont.style.transformOrigin = `${mouseX}px ${mouseY}px`;
//     cont.style.transform = `scale(${scale})`;
//     lastTransform.left = mouseX;
//     lastTransform.top = mouseY;
//     savePositions();
//     console.log('the point of the mouse after is - '+ event.clientX + ', ' + event.clientY);
//     // if(e.ctrlKey) {
//     // }
// });

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
