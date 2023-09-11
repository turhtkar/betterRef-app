const interact = require('interactjs');
const { ipcRenderer } = require('electron');
const { webFrame } = require('electron');


let zoomFactor = 1.24; // Keep track of the zoom level
var lastTransform = {x: 0 , y:0};
var focusedElement = -1; // Keep track of the focused element
let translation = {x: 0, y: 0};
let scale = 1;
var lastZoomPoint = {x: 0, y: 0};
var centerPoint = {x:0, y:0}
var selectedElement = 0;
var lastReminderWidth = 0;
var lastReminderHeight = 0;
var centerX = 0;
var centerY = 0;

let zIndex = 0;
let load = 0;
let lastPos = {left: 0, top: 0, right: 0, bottom: 0}
let pos = {left: 0, top: 0, right: 0, bottom: 0};
var isResize = 0;
var isDragging = false;
var currVid = 0;


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
        //Zoom on mouse wheel event
        let accx = 0, accy = 0;

        refGrid.addEventListener("wheel", (e) => {
            if(e.target !== refGrid) {
                return;
            }
            if(selectedElement) {
                console.log(selectedElement.offsetX);
                console.log(e.offsetX);
            }
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
            e.preventDefault();
            if (e.deltaY < 0) {
                scale *= 1.24;
                accx = lastTransform.x + e.offsetX * scale/1.24 - e.offsetX * scale;
                accy = lastTransform.y + e.offsetY * scale/1.24 - e.offsetY * scale;
            } else {
                scale /= 1.24;
                accx = lastTransform.x + e.offsetX * scale * 1.24 - e.offsetX * scale;
                accy = lastTransform.y + e.offsetY * scale * 1.24 - e.offsetY * scale;
            }

            refGrid.style.transformOrigin = "0 0";
            e.target.style.transform = `scale3D(${scale}, ${scale}, ${scale})`
            wrapperGrid.style.transform = `translate(${accx}px, ${accy}px)`;
            //for easy access into the wrapperGrid.style.Transform translate Points
            lastTransform.x = accx;
            lastTransform.y = accy;
            lastZoomPoint.x = accx;
            lastZoomPoint.y = accy;
            if(selectedElement != 0) {
                // updateBoundingBox(selectedElement);
            }
            // translation.x = accx;
            // translation.y = accy;
            
            // boundBox = document.querySelector('#boundingBox');
            // if(boundBox.style.display != 'none') {
            //     boundBox.style.transform = 'translate( ' + (translation.x + refGrid.getBoundingClientRect().x)/scale + 'px, ' + (translation.y + refGrid.getBoundingClientRect().y)/scale + 'px)'
            //     boundBox.style.transform = `scale3D(${scale}, ${scale}, ${scale})`
            // }
        });

        let isPanning = false;
        let startPan = { x: 0, y: 0 };
        let accPan = { x: 0, y: 0 };

        wrapperGrid.addEventListener("mousedown", (e) => {
            if (e.button === 1) {  // Check if the middle (wheel) button is pressed
                isPanning = true;
                startPan = { x: (e.clientX/scale), y: (e.clientY/scale) };
            }
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
        });

        wrapperGrid.addEventListener("mousemove", (e) => {
            if (isPanning) {
                // Calculate the distance moved since the last mousemove event
                let dx = e.clientX/scale - startPan.x;
                let dy = e.clientY/scale - startPan.y;
                // get the wrapper translate
                const style = window.getComputedStyle(wrapperGrid)
                const matrixValues = style.transform.match(/matrix.*\((.+)\)/)[1].split(', ');
                const x = parseFloat(matrixValues[4]);
                const y = parseFloat(matrixValues[5]);

                // Accumulate the total distance moved for panning
                accPan.x = (dx*scale)+x;
                accPan.y = (dy*scale)+y;

                // Apply the pan transformation
                console.log('accPan.x - ' + startPan.x);
                wrapperGrid.style.transform = `translate(${accPan.x}px, ${accPan.y}px)`;
                lastTransform.x = accPan.x;
                lastTransform.y = accPan.y;                

                // update the bounding box
                if(selectedElement!=0) {
                    console.log('selected element is ' + selectedElement);
                    // updateBoundingBox(selectedElement);
                }
                // Reset the start position for the next mousemove event
                startPan = { x: (e.clientX/scale), y: (e.clientY/scale) };
            }
        });

        document.addEventListener("mouseup", (e) => {
            if (e.button === 1) {  // Check if the middle (wheel) button is released
                isPanning = false;
            }
        });


        
        for (let f of event.dataTransfer.files) {
            
        // Create container for each element
        let container = document.createElement('div');
        container.className = 'draggable container';
        container.style.position = 'relative';
        container.style.overflow = 'visable';
        // boundingBox.appendChild(container);
            
        // Create bounding box
        let boundingBox = document.createElement('div');
        boundingBox.id = 'boundingBox';
        container.appendChild(boundingBox);

        // Add handles to the bounding box
        const handles = ["tl", "tm", "ml", "tr", "mr", "bl", "bm", "br"];
        handles.forEach(handle => {
            let div = document.createElement('div');
            div.className = `square handle-${handle}`;
            boundingBox.appendChild(div);
        });

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
                let player = document.createElement('div');
                let video = document.createElement('video');
                player.className = "player";
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

                // Add the timeupdate event listener to this video
                video.addEventListener('timeupdate', handleProgress);
                // After adding the event listener for timeupdate, add one for play as well:
                // video.addEventListener('play', () => startProgress(video));

                player.appendChild(video);
                // container.appendChild(video);// Append the video to it's container

                // Create controls container
                let controls = document.createElement('div');
                controls.className = 'player__controls';

                // // Create progress container
                // let progress = document.createElement('div');
                // progress.className = 'progress';
                // let progressFilled = document.createElement('div');
                // progressFilled.className = 'progress__filled';
                // progress.appendChild(progressFilled);
                // controls.appendChild(progress);  // Append progress to controls
                

                // Create progress bar

                let progressBar = document.createElement('div');
                progressBar.className = 'progress';
                // progressBar.setAttribute('value', '0');
                // progressBar.setAttribute('max', '100');

                //TimeLineScrubbingEvents
                progressBar.addEventListener("mousemove", handleTimelineUpdate);
                progressBar.addEventListener("mousedown", toggleScrubbing);
                document.addEventListener("mouseup", e => {
                if (isScrubbing) toggleScrubbing(e);
                })
                document.addEventListener("mousemove", e => {
                if (isScrubbing) handleTimelineUpdate(e);
                })

                controls.appendChild(progressBar);  // Append progress bar to controls

                // Append the controls div to the main player
                player.appendChild(controls);

                // Finally, append the entire player to your container
                container.appendChild(player);
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
                    ignoreFrom: '.vidPause',
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
                    // margin: 10,
                    inertia: true,
                    modifiers: [
                        interact.modifiers.restrictRect({
                            restriction: 'parent',
                            elementRect: { top: 0, left: 0, bottom: 1, right: 1 },
                            endOnly: true
                        }),
                        interact.modifiers.restrictSize({
                            min: { width: 50, height: 50 },
                        }),
                    ],
                    listeners: { move: resizeMoveListener, end: endResizeListener },
                    ignoreFrom: '.vidPause',
                });
        
                container.addEventListener('click', function(event) {
                    event.stopPropagation();
                    hideAllCloseButtons();
                    let closeButton = this.querySelector('.close-button');
                    selectedElement = 0;
                    if (closeButton) {
                        closeButton.style.display = 'block';
                        selectedElement = event;
                        let boundingBox = this.querySelector('#boundingBox');
                        if(boundingBox) {
                            boundingBox.style.display = "block";
                        }
                        // updateBoundingBox(event);
                        console.log('this is where u looking for - ');
                        console.log(event.target.getBoundingClientRect().x);
                        console.log(event.offsetX);
                    }
                });
            }

        // Hide the drop zone
        dropZone.style.display = 'none';
        return false;
    };
}

function hideAllCloseButtons() {
    let closeButtons = document.querySelectorAll('.close-button');
    let boundBoxs = document.querySelectorAll("#boundingBox");
    boundBoxs.forEach(function(boundBox) {
        boundBox.style.display='none';
    });
    closeButtons.forEach(function(button) {
        button.style.display = 'none';
        console.log('close button off');
    });
}
// hide close button when click anywhere else on the document
document.addEventListener('click', function(event) {
    var centerGrid = document.getElementById('grid-snap').getBoundingClientRect();
    centerPoint.x = centerGrid.width/2;
    centerPoint.y = centerGrid.height/2;
    console.log('this is the point you clicked at - ' + event.x + ' , ' + event.y);
    console.log(document.getElementById('grid-snap').getBoundingClientRect());
    selectedElement=0;
    hideAllCloseButtons();
});



function dragMoveListener(event) {
    var target = event.target;
    isDragging = true;
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
    console.log(x + ' this is the current x');
    console.log((event.dx/scale) + ' this is the (event.dx/scale)');
    console.log(parseFloat(target.getAttribute('data-x')) + ' this is data X');
    console.log(event.dx + ' this is the current dx');
    console.log(event.dy + ' this is the current dy');
    if(y>=0 && x>=0){
        target.style.transform = 'translate(' + x + 'px, ' + y + 'px)';
        target.setAttribute('data-x', x);
        target.setAttribute('data-y', y);
        translation.x = x;
        translation.y = y;
    }
    getOutOfBoundTravel(event);
}

function endDragListener(event) {
    isDragging=false;
    getOutOfBoundTravel(event);
    // updateBoundingBox(event);
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
        // updateBoundingBox(event);
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
    if(lastPos.bottom>0 || lastPos.right>0) {
        resizeCanvas(event);
    }else {
        // updateBoundingBox(event);
    }
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
        contStyle.height = ((boundRect.height/scale + lastPos.bottom) + 'px');
        //change bounding box y since when we increase the grid width we are also changing the intial y of the boundingBox since
        // it is placed on the same depth level as the wrapper and so it is using the x y cordinate system of the body.
    }
    lastPos.bottom = 0;
    lastPos.right = 0;
    centerPoint.x = boundRect.width/2;
    centerPoint.y = boundRect.height/2;
    document.body.offsetHeight;
    if(selectedElement!=0) {
        // updateBoundingBox(event);
    }
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

    target.style.width = rect.width/scale + 'px';
    target.style.height = rect.height/scale + 'px';
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
        // updateBoundingBox(event);
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
    // updateBoundingBox(event);

    //play/pause video if the target is played
    const foundVideo = event.currentTarget.querySelector('video');
    if (foundVideo) {
        currVid = foundVideo;
        togglePlayPause(event);
    }
    event.preventDefault();
});

interact('body').on('click', function(event) {
    // if the clicked element is not an image, hide the bounding box
    if (event.target.className !== 'draggable') {
        let previousSelected = document.querySelector('.selected');
        if (previousSelected) {
            previousSelected.classList.remove('selected');
            let boundingBox = document.querySelector('#boundingBox');
            boundingBox.style.display = 'none';
        }
    }
});

function updateBoundingBox(element) {
    if(!isDragging) return;
    var targetRect = 0;
    if(element.target) {
        targetRect = element.target.getBoundingClientRect();
    }else {
        targetRect = element.getBoundingClientRect();
    }
    //get the boundingBox element
    const boundingBox = document.querySelector('#boundingBox');
    var boundWidth = targetRect.width;
    var boundHeight = targetRect.height
    boundingBox.style.display = 'block';
    // get the grid transition to calculate the new transition of the grid
    let gridSnap = document.getElementById('grid-snap').getBoundingClientRect();
    // boundingBox.style.transform = 'translate(' + (gridSnap.x + translation.x - 7)+ 'px, ' + (gridSnap.y + translation.y -7) + 'px)';
    boundingBox.style.left = targetRect.x + 'px';
    boundingBox.style.top = targetRect.y + 'px';
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

// document.addEventListener('click', function(event) {
//     hideAllCloseButtons();
// });

// function hideAllCloseButtons() {
//     let closeButtons = document.querySelectorAll('.close-button');
//     closeButtons.forEach(function(button) {
//         button.style.display = 'none';
//     });
// }

  
// Listen for the 'create-new-note' event
ipcRenderer.on('create-new-note', createNewNote);

// Get Element Max Focused Size - used to see the max amount of scale by the scale factor so that a 'focused element' will fit the
// user window
function getElementMaxFocusedSize(targetWidth, targetHeight, currScale, direction) {
    const windowWidth = window.innerWidth;
    const windowHight = window.innerHeight;
    var currWidth = targetWidth;
    var currHeight = targetHeight;
    var maxScale = currScale;
    // target.getBoundingClientRect().width
    console.log('this is the curr width - ' + currWidth);
    console.log('this is the curr height - ' + currHeight);
    console.log('this is the window width - ' + windowWidth); 
    console.log('this is the window height - ' + windowHight);          
    if(direction>0) {//if the intial element size is smaller then the windowSize we multiply by the zoom factor, like we zoom in
        while(((currWidth*zoomFactor) <= windowWidth) && ((currHeight*zoomFactor) <=  windowHight)) {
            console.log(currWidth);
            currWidth*=zoomFactor;
            currHeight*=zoomFactor
            maxScale*=zoomFactor;
        }
    }else {//if the intial element size is bigger then the windowSize we divide by the zoom factor, like we zoom out
        while(((currWidth) > windowWidth) || ((currHeight) >  windowHight)) {
            console.log(maxScale);
            maxScale/=zoomFactor;
            currWidth/=zoomFactor;
            currHeight/=zoomFactor;
        }
        
    }
    return maxScale;
}

document.addEventListener('keydown', function(event) {
    if((event.key !== 'ArrowRight') && (event.key !== 'ArrowLeft')) {
        console.log(event.key);
        return;
    }
    event.preventDefault();
    (event.key === 'ArrowRight') ? focusedElement++ : focusedElement--;//if we press right arrow key we got to the next element and if we press the left arrow key we go to the previous element
    console.log('focusedElement - ' + focusedElement);
    let draggableItems = document.querySelectorAll('.draggable');
    //on evrey right arrow keyboard click we got to the next item of the draggable items increasing the focusedElement by 1
    // so if we reach to a focusedElement that is equal to the amount of them then you would cycle back to the first dragged element
    if(focusedElement === draggableItems.length) {
        focusedElement=0;
    }
    if(focusedElement < 0) {
        focusedElement = (draggableItems.length-1);
    }
    let target = draggableItems[focusedElement];
    let targetRect = target.getBoundingClientRect();
    var direction = 1;
    if((targetRect.width > window.innerWidth) || (targetRect.height > window.innerHeight)) {
        direction = -1;
    }
    console.log(direction);
    var maxScale = getElementMaxFocusedSize(targetRect.width, targetRect.height, scale, direction);
    updateF(target, maxScale);
    scale = maxScale;
    hideAllCloseButtons();
    let closeButton = target.querySelector('.close-button');
    selectedElement = 0;
    if (closeButton) {
        closeButton.style.display = 'block';
        selectedElement = target;
        selectedElement.style.zIndex = ++zIndex;
        let boundBox = selectedElement.querySelector('#boundingBox');
        boundBox.style.display = 'block';
        // updateBoundingBox(target);
    }
});


function updateF(target, maxScale) {
    // savePositions();
    var gridSnap = document.getElementById('grid-snap');
    var gridRect = gridSnap.getBoundingClientRect();
    var wrapper = document.getElementsByClassName('wrapper-grid')[0];
    var targetRect = target.getBoundingClientRect();
    const boundingBox = document.querySelector('#boundingBox');
    var scaledWidth = (targetRect.width/scale)*maxScale;
    var scaledHeight = (targetRect.height/scale)*maxScale;

    var reminderWidth = (window.innerWidth - scaledWidth)/2;
    var reminderHeight = (window.innerHeight - scaledHeight)/2;

    if((lastTransform.x==0 && lastTransform.y==0)) {

        centerX = reminderWidth - ((targetRect.x)/scale)*maxScale;
        centerY = reminderHeight - ((targetRect.y - gridRect.y - lastReminderHeight)/scale)*maxScale - gridRect.y;//we subtract the gridSnap.y since it's intally starts with a y value>0 because we center it on start
    }else {
        console.log('1');
        centerX = (reminderWidth) + ((((lastTransform.x-targetRect.x)/scale)*maxScale));
        centerY = reminderHeight + (((((targetRect.y-gridRect.y)/scale)*maxScale) - targetRect.y)*-1) + (lastTransform.y-targetRect.y) - gridRect.y;
    }
    // if(gridRect.x>0) {
    //     console.log('2');
    //     centerX = reminderWidth - ((targetRect.x-lastReminderWidth)/scale)*maxScale;
    // }
    if(((((targetRect.y-gridRect.y)/scale)*maxScale) + reminderHeight + scaledHeight)>window.innerHeight) {
        console.log('4');
        centerY = reminderHeight + (((((targetRect.y-gridRect.y)/scale)*maxScale) - targetRect.y)*-1) + (lastTransform.y-targetRect.y) - gridRect.y;
    }
    // if(((((targetRect.x-gridRect.x)/scale)*maxScale) + reminderWidth + scaledWidth)>window.innerWidth) {
    //     console.log('4');
    //     centerY = reminderHeight + (((((targetRect.y-gridRect.y)/scale)*maxScale) - targetRect.y)*-1) + (lastTransform.y-targetRect.y) - gridRect.y;
    // }
    // if(gridRect.y>0 && lastTransform.y!=0) {
    //     console.log('3');
    //     centerY = reminderHeight + (lastTransform.y-lastReminderHeight);
    // }


    if(scale != maxScale) {
        lastReminderWidth = reminderWidth;
        lastReminderHeight = reminderHeight;
    }

    lastTransform.x = centerX;
    lastTransform.y = centerY;

    gridSnap.style.transformOrigin = "0 0";
    gridSnap.style.transform = `scale3D(${maxScale}, ${maxScale}, ${maxScale})`;
    wrapper.style.transform = `translate(${centerX}px, ${centerY}px)`;
}


//video player functionality
const videos = document.querySelectorAll('video');

//VIDEO PROGRESS BAR: TIME TO WIDTH
const handleProgress = (event) => {
    const video = event.target;
    const progressBar = video.parentElement.querySelector('.progress');
    const percent = video.currentTime / video.duration
    progressBar.parentElement.style.setProperty("--progress-position", percent)
    
}

let isScrubbing = false
let wasPaused
function toggleScrubbing(e) {
    e.preventDefault();
    const progressBar = e.target;
    const foundVideo = progressBar.parentElement.parentElement.querySelector('video');
    const video = foundVideo || currVid;
    if (foundVideo) {
        currVid = foundVideo;
    }
    const rect = progressBar.getBoundingClientRect();
    const percent = (Math.min(Math.max(0, e.x - rect.x), rect.width) / rect.width);
    isScrubbing = (e.buttons & 1) === 1;
    video.classList.toggle("scrubbing", isScrubbing);
    if (isScrubbing) {
        progressBar.classList.add('scrubbing');
        // wasPaused = video.paused;
        // console.log('scrub');
        // video.pause();
    } else {
        progressBar.classList.remove('scrubbing');
        video.currentTime = percent * video.duration;
        // console.log('no scrub');
        // console.log(video.currentTime)
        // if (!wasPaused) video.play();
    }

    handleTimelineUpdate(e)
}

function handleTimelineUpdate(e) {
    const progressBar = e.target;
    const foundVideo = progressBar.parentElement.parentElement.querySelector('video');
    const video = foundVideo || currVid;
    if (foundVideo) {
        currVid = foundVideo;
    }
    const rect = progressBar.getBoundingClientRect();
    const percent = (Math.min(Math.max(0, e.x - rect.x), rect.width) / rect.width);

    // const previewImgNumber = Math.max(
    //     1,
    //     Math.floor((percent * video.duration) / 10)
    // )
    // const previewImgSrc = `assets/previewImgs/preview${previewImgNumber}.jpg`
    // previewImg.src = previewImgSrc
    progressBar.parentElement.style.setProperty("--preview-position", percent);
    console.log('white');


    if (isScrubbing) {
        e.preventDefault();
        // thumbnailImg.src = previewImgSrc
        progressBar.parentElement.style.setProperty("--progress-position", percent)
    }
}

function togglePlayPause(event) {
    const foundVideo = event.currentTarget.querySelector('video');
    var progressBar = event.target.querySelector('.progress');
    const video = foundVideo || currVid;
    if (foundVideo) {
        currVid = foundVideo;
    }
    if (video.paused) {
        video.play();

        progressBar = video.parentElement.querySelector('.progress');
        progressBar.classList.remove('vidPause');
        progressBar.style.height = '7px';

    } else {
        video.pause();
        progressBar = video.parentElement.querySelector('.progress');
        progressBar.classList.add('vidPause');
        progressBar.style.height = '15px';
        
    }
}
//VIDEO PROGRESS BAR: WIDTH TO TIME
// const scrub = e => {

//     // video.currentTime = video.duration / (e.target.style.flexBasis/100);
//     const scrubTime = (e.offsetX / progress.offsetWidth) * video.duration;
//     video.currentTime = scrubTime;
//   }
