const interact = require('interactjs');
const { ipcRenderer } = require('electron');
const { webFrame } = require('electron');
// Get the body element
let body = document.body;

let scale = 1; // initial scale factor
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

        // Hide the drop zone
        dropZone.style.display = 'none';
        return false;
    };
}

function dragMoveListener(event) {
    var target = event.target;
    event.target.style.zIndex = 1000;
    var x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
    var y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;
    target.style.transform = 'translate(' + x + 'px, ' + y + 'px)';
    target.setAttribute('data-x', x);
    target.setAttribute('data-y', y);
}

function endDragListener(event) {
    getOutOfBoundTravel(event);
    resizeCanvas(event);
    var textEl = event.target.querySelector('p');
    event.target.style.zIndex = zIndex++;
    textEl && (textEl.textContent = 'moved a distance of ' +
        (Math.sqrt(Math.pow(event.pageX - event.x0, 2) +
            Math.pow(event.pageY - event.y0, 2) | 0))
            .toFixed(2) + 'px');
}
function getOutOfBoundTravel(event) {
    var boundRect = document.getElementById('grid-snap').getBoundingClientRect();
    var targetRect = event.target.getBoundingClientRect();

    lastPos.left = (boundRect.x-targetRect.x);
    lastPos.right = (targetRect.right-boundRect.right);
    lastPos.top = (boundRect.top-targetRect.top);
    lastPos.bottom = (targetRect.bottom-boundRect.bottom);
}

function resizeCanvas(event) {
    boundRect = document.getElementById('grid-snap').getBoundingClientRect();
    contStyle = document.getElementById('grid-snap').style;
     if(lastPos.left>0) {
        if(!event.target.style.left) {
            event.target.style.left = '0px';
        }
        var left =  parseFloat(event.target.style.left) + lastPos.left;
        event.target.style.left = left+ 'px';  
    }
    if (lastPos.right>0) {
        pos.right += lastPos.right;
        contStyle.width = ((boundRect.width + lastPos.right) + 'px');
    }
    if (lastPos.top>0) {
        if(!event.target.style.top) {
            event.target.style.top = '0px';
        }
        var top =  parseFloat(event.target.style.top) + lastPos.top;
        event.target.style.top = top+ 'px';
    }
    if (lastPos.bottom>0) {
        pos.bottom += lastPos.bottom;
        contStyle.height = ((boundRect.height + lastPos.bottom) + 'px');
    }
    lastPos.bottom = 0;
    lastPos.left = 0;
    lastPos.right = 0;
    lastPos.top = 0;
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

// window.onresize = function() {
//     setTimeout(function() {
//         let draggableItems = document.querySelectorAll('.draggable');
//         draggableItems.forEach(function(item) {
//             let x = parseFloat(item.getAttribute('data-x'));
//             let y = parseFloat(item.getAttribute('data-y'));

//             if (x > window.innerWidth - item.offsetWidth) {
//                 x = window.innerWidth - item.offsetWidth;
//                 item.style.transform = 'translate(' + x + 'px, ' + y + 'px)';
//                 item.setAttribute('data-x', x);
//             }

//             if (y > window.innerHeight - item.offsetHeight) {
//                 y = window.innerHeight - item.offsetHeight;
//                 item.style.transform = 'translate(' + x + 'px, ' + y + 'px)';
//                 item.setAttribute('data-y', y);
//             }
//         });
//     }, 100);

// }

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

// Add the 'wheel' event listener
window.addEventListener('wheel', (event) => {
    if (event.ctrlKey) {
      event.preventDefault(); // Prevent the default scroll behavior
  
      const zoomIncrement = 0.1; // Adjust the zoom increment as needed
    //   let padding = ((window.innerHeight / 100)*10);
      let padding = window.getComputedStyle(document.documentElement, null).getPropertyValue('padding');

  
        if (event.deltaY < 0) {
            // Zoom in
            webFrame.setZoomFactor(webFrame.getZoomFactor() + zoomIncrement);
            // document.documentElement.style["boxShadow"] = '0 0 0 ' + padding + 'px #FF7A59';
            // document.documentElement.style["boxShadow"] = '0 0 0 20px #FF7A59';
        } else {
            // Zoom out
            webFrame.setZoomFactor(webFrame.getZoomFactor() - zoomIncrement);
            // document.documentElement.style["boxShadow"] = '0 0 0 ' + padding + 'px #FF7A59';
        }
    }
    // setTimeout(updateBoxShadow(), 500);
  });


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