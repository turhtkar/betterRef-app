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
var videoData = {startTime: 0, endTime: 0};
let isModalOpen = false;
let runVid = false;
var colorModalOpen = false;
var isInteracting;
var sizeRelative = false;
var fontPresetList = [
    {innerHTML: 'NaN', fontStyle: 'normal' , fontSize: 20, fontFamily: 'roboto', justifyContent: 'center', padding: '0px', paddingBottom: '0px', paddingLeft:'0px', paddingTop:'0px',paddingRight:'0px', lineHeight:'1', textDecorationLine: '', Superscript: false, SmallCaps: false, AllCaps: false},
    {innerHTML: 'NaN', fontStyle: 'normal' , fontSize: 20, fontFamily: 'roboto', justifyContent: 'center', padding: '0px', paddingBottom: '0px', paddingLeft:'0px', paddingTop:'0px',paddingRight:'0px', lineHeight:'1', textDecorationLine: '', Superscript: false, SmallCaps: false, AllCaps: false},
    {innerHTML: 'NaN', fontStyle: 'normal' , fontSize: 20, fontFamily: 'roboto', justifyContent: 'center', padding: '0px', paddingBottom: '0px', paddingLeft:'0px', paddingTop:'0px',paddingRight:'0px', lineHeight:'1', textDecorationLine: '', Superscript: false, SmallCaps: false, AllCaps: false},
    {innerHTML: 'NaN', fontStyle: 'normal' , fontSize: 20, fontFamily: 'roboto', justifyContent: 'center', padding: '0px', paddingBottom: '0px', paddingLeft:'0px', paddingTop:'0px',paddingRight:'0px', lineHeight:'1', textDecorationLine: '', Superscript: false, SmallCaps: false, AllCaps: false},
    {innerHTML: 'NaN', fontStyle: 'normal' , fontSize: 20, fontFamily: 'roboto', justifyContent: 'center', padding: '0px', paddingBottom: '0px', paddingLeft:'0px', paddingTop:'0px',paddingRight:'0px', lineHeight:'1', textDecorationLine: '', Superscript: false, SmallCaps: false, AllCaps: false},
    {innerHTML: 'NaN', fontStyle: 'normal' , fontSize: 20, fontFamily: 'roboto', justifyContent: 'center', padding: '0px', paddingBottom: '0px', paddingLeft:'0px', paddingTop:'0px',paddingRight:'0px', lineHeight:'1', textDecorationLine: '', Superscript: false, SmallCaps: false, AllCaps: false},
    {innerHTML: 'NaN', fontStyle: 'normal' , fontSize: 20, fontFamily: 'roboto', justifyContent: 'center', padding: '0px', paddingBottom: '0px', paddingLeft:'0px', paddingTop:'0px',paddingRight:'0px', lineHeight:'1', textDecorationLine: '', Superscript: false, SmallCaps: false, AllCaps: false}];
var multipleSelection = false;
var isOutofBound = false;
var selectedElements = null;
var elementsGrid = null;
var wrapper = null;
var gridSnap = null;
var previousElementGridPos={left:0, top:0};
var interactableElements=[];
var isSnappingEnabled = false;
var undoList = [];

function storeStyleBeforeChange(element, property, x, y) {
    // var previousValue = element.style[property];
    switch(property) {
        case 'translate': 
        undoList.push({
            element: element,
            property: property,
            x: x,
            y: y
        });
        break;

        case 'scale3D':
        undoList.push({
            element: element,
            property: property,
            scale: scale
        });
        break;
        
    }
    // console.log('this is the style saved for the undo \n ' + previousValue);
    // undoList.push({
    //     element: element,
    //     property: property,
    //     value: previousValue
    // });
}
function undoStyle () {
    if (undoList.length > 0) {
        
        var change = undoList.pop();
        console.log('this is the style to undo \n ' + change);
        console.log(change instanceof Object);
        console.log(change.property);
        if(change instanceof Array) {
            change.forEach((item) => {
                item.element.style.transform = `translate(${item.x}px,${item.y}px)`;
                item.element.setAttribute('data-x', item.x);
                item.element.setAttribute('data-y', item.y);
            });
        }else {
            if(change.property==='translate') {

                change.element.style.transform = `translate(${change.x}px,${change.y}px)`;
                change.element.setAttribute('data-x', change.x);
                change.element.setAttribute('data-y', change.y);
            }
            else if(change.property==='scale3D') {
                change.element.style.transform = `scale3D(${change.scale},${change.scale},${change.scale})`;
            }
            else if(change.property==='resize') {
                console.log(change)
                change.element.style.transform = `translate(${change.x}px,${change.y}px)`;
                change.element.setAttribute('data-x', change.x);
                change.element.setAttribute('data-y', change.y);                
                change.element.style.height = `${change.height}px`;
                change.element.style.width = `${change.width}px`;
            }
        }
        
    }
}
ipcRenderer.on('undo-element', undoStyle);


document.addEventListener('click', function() {
    //safe keep method for avoiding 'errors' regarding the selection box
    // by errors I mean, if the user would move the mouse too hard to the corners
    // then sometimes it would break and add a selection box without removing it
    var selectionBox = document.querySelector('.selectionBox');
    if(selectionBox) {
        selectionBox.remove();
        selectionBox = null;
                    
        initialX = initialY = finalX = finalY = null;
                    
        isHolding = false;
    }
});

function getOrCreateGrid() {
    let refGrid = document.getElementById('grid-snap');
    let wrapperGrid = document.querySelector('.wrapper-grid');

    if(!refGrid) {
        refGrid = document.createElement('div');
        wrapperGrid = document.createElement('div');
        wrapperGrid.className = 'wrapper-grid';
        refGrid.id = 'grid-snap';
        wrapperGrid.appendChild(refGrid);
        document.body.appendChild(wrapperGrid);

        // Create element Grid
        let elementGrid = document.createElement('div');
        elementGrid.className = 'elementGrid';
        refGrid.appendChild(elementGrid);

        // Add handles to the bounding box
        const handles = ["tl", "tm", "ml", "tr", "mr", "bl", "bm", "br"];
        handles.forEach(handle => {
            let div = document.createElement('div');
            div.className = `square handle-${handle}`;
            elementGrid.appendChild(div);
        });
        elementsGrid = elementGrid;
        wrapper = wrapperGrid;
        gridSnap = refGrid;
        

        //make the element grid an interact js object
        // interact('.elementGrid')
        // .draggable({
        //     onstart: [function(event) {
        //         // Disable individual dragging of children
        //         let children = Array.from(event.target.children);
        //         children.forEach(child => {
        //             child.setAttribute('data-no-drag', 'true');  // Just a custom attribute to track
        //         });
        //     }, ],
        //     onmousemove: dragMoveListener,
        //     onend: [function(event) {
        //         // Re-enable individual dragging of children and update their translate values
        //         let children = Array.from(event.target.children);
        //         children.forEach(child => {
        //             child.removeAttribute('data-no-drag');
        //             // Assuming you use a utility function like this to update their translate values:
        //             // savePositions();
        //         });
        //     }, endDragListener],
        //     // ... other drag handlers
        // });
        // document.addEventListener('click', (e) => {
        //     // if(multipleSelection=true) {
        //     //     return;
        //     // }
        //     var target = e.target;
        //     console.log(e.target);
        //     while (target) {
        //         if (Array.from(elementGrid.children).includes(target)) {
        //             console.log('nigger\n\n\n\n');
        //             return;
        //         }
        //         target = target.parentElement;
        //     }
        //     multipleSelection = false;
        //     Array.from(elementGrid.children).forEach(child => {
        //         if(child.className.includes('handle')) {
        //             let boundingBox = child.querySelector('#boundingBox');
        //             if(boundingBox) {
        //                 Array.from(boundingBox.children).forEach(handle => {
        //                     handle.style.display = 'block';
        //                 });
        //                 boundingBox.style.display = "none";
        //                 refGrid.appendChild(child);
        //             }
        //         }
        //     });
        //     elementGrid.style.display = 'none';
        // });
    }

    return { refGrid, wrapperGrid };
}

//Drag and drop img files into the application window to use them
window.onload = function() {
    
    let dropZone = document.getElementById('drop_zone');
    
    document.ondragover = (event) => {
        event.preventDefault();
        dropZone.style.zIndex=100000;
    }
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
        console.log('nig');
        
        const { refGrid, wrapperGrid } = getOrCreateGrid();
        //Zoom on mouse wheel event
        let accx = 0, accy = 0;

        function handleZoom(e) {
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

            //add the last styles added to the undo list
            storeStyleBeforeChange(e.target, 'scale3D', scale);
            storeStyleBeforeChange(wrapperGrid, 'translate', lastTransform.x, lastTransform.y);
            // undoList.push(refGrid.style.transform = `scale3D(${scale}, ${scale}, ${scale})`);


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
        }
        refGrid.addEventListener("wheel",handleZoom);

        let selectionBox = null;
        let initialX, initialY, finalX, finalY;
        let isHolding = false;

        interact(refGrid)
            .on('down', function(e) {
                if(e.button !== 0) {
                    return;
                }
                // const e = event.pointer;
                console.log(e.target);
                if (!(e.target.parentElement.classList.contains("textboxContainer") || e.target.parentElement.classList.contains("draggable") || e.target.parentElement.classList.contains("player"))) {
                    if(multipleSelection) {
                        deSelectMultiElem();
                    }
                    console.log(e.target);
                    initialX = e.clientX;
                    initialY = e.clientY;

                    selectionBox = document.createElement("div");
                    selectionBox.className = "selectionBox";
                    document.body.appendChild(selectionBox);

                    isHolding = true;
                }
            })
            .on('move', function(event) {
                if (isHolding) {
                    console.log('nigger \n\n\n\n');
                    finalX = event.clientX;
                    finalY = event.clientY;

                    let boxX = Math.min(initialX, finalX);
                    let boxY = Math.min(initialY, finalY);
                    let boxWidth = Math.abs(initialX - finalX);
                    let boxHeight = Math.abs(initialY - finalY);

                    Object.assign(selectionBox.style, {
                        left: boxX + "px",
                        top: boxY + "px",
                        width: boxWidth + "px",
                        height: boxHeight + "px"
                    });
                    if (selectionBox) {
                        if (!(finalX != null && finalY != null)) {
                            return;
                        }
                        const elementGrid = refGrid.querySelector('.elementGrid');
                        var left = initialX;
                        var right = finalX;
                        var top = initialY;
                        var bottom = finalY;
                        var selectElementGrid = { left: 0, top: 0, right: 0, bottom: 0 };
                        if (initialX > finalX) {
                            left = finalX;
                            right = initialX;
                        }
                        if (initialY > finalY) {
                            top = finalY;
                            bottom = initialY;
                        }
                        let draggableItems = document.querySelectorAll(".draggable");
                        draggableItems.forEach(el => {
                            let rect = el.getBoundingClientRect();
                            if (((rect.left <= left && rect.right >= left) || (rect.left >= left && rect.left <= right))
                                && ((rect.top <= top && rect.bottom >= top) || (rect.top >= top && rect.top <= bottom))) {
                                //the element collided with the selection box so we add it to the element grid
                                // el.classList.add('selected');
                                el.classList.add('selected');
                                //then we showing the bounding box itself of the selected element
                                // without her handles since we get the handles
                                // from the element grid
                                let boundingBox = el.querySelector('#boundingBox');
                                if (boundingBox) {
                                    Array.from(boundingBox.children).forEach(child => {
                                        child.style.display = 'none';
                                    });
                                    boundingBox.style.display = "block";
                                }
                                // intialize selected element grid
                                if (selectElementGrid.left === 0) {
                                    selectElementGrid.left = rect.left;
                                    selectElementGrid.top = rect.top;
                                    selectElementGrid.right = rect.right;
                                    selectElementGrid.bottom = rect.bottom;
                                } else {
                                    if (selectElementGrid.left > rect.left) {
                                        selectElementGrid.left = rect.left;
                                    }
                                    if (selectElementGrid.top > rect.top) {
                                        selectElementGrid.top = rect.top;
                                    }
                                    if (selectElementGrid.right < rect.right) {
                                        selectElementGrid.right = rect.right;
                                    }
                                    if (selectElementGrid.bottom < rect.bottom) {
                                        selectElementGrid.bottom = rect.bottom;
                                    }
                                }
                                // elementsGrid.appendChild(el);
                                drawElementGrid(selectElementGrid);
                            }
                            // let previousSelected = document.querySelectorAll('.selected');
                            // if (previousSelected) {
                            //     let previousSelectedList = Array.from(previousSelected);
                            //     if(previousSelectedList.length===2) {
                            //         previousSelectedList.forEach(selected => {
                            //             if(!selected.classList.contains('elementGrid')) {
                            //                 let rect = selected.getBoundingClientRect();
                            //                 if (rect.left != selectionBox.left) {
                            //                     selected.classList.remove('selected');
                            //                     let boundingBox = selected.querySelector('#boundingBox');
                            //                     if (!(((rect.left <= left && rect.right >= left) || (rect.left >= left && rect.left <= right))
                            //                     && ((rect.top <= top && rect.bottom >= top) || (rect.top >= top && rect.top <= bottom)))) {
                            //                         Array.from(boundingBox.children).forEach(handle => {
                            //                             handle.style.display = 'block';
                            //                         });
                            //                         boundingBox.style.display = 'none';
                            //                     }
                            //                 }
                            //             }
                            //         });
                            //     }
                            //     // if(Array.from(document.querySelectorAll('.selected')).length===1) {
                            //     //     eGrid = document.querySelector('.elementGrid');
                            //     //     eGrid.style.display='none';
                            //     //     eGrid.classList.remove('selected');
                            //     // }
                            // }
                        });
                        // let draggableNotes = document.querySelectorAll(".textboxContainer");
                        // draggableNotes.forEach(el => {
                        //     let rect = el.getBoundingClientRect();
                        //     if (((rect.left <= left && rect.right >= left) || (rect.left >= left && rect.left <= right))
                        //         && ((rect.top <= top && rect.bottom >= top) || (rect.top >= top && rect.top <= bottom))) {
                        //         //the element collided with the selection box so we add it to the element grid
                        //         el.classList.add('selected');
                        //         //then we showing the bounding box itself of the selected element
                        //         // without her handles since we get the handles
                        //         // from the element grid
                        //         let boundingBox = el.querySelector('#boundingBox');
                        //         if (boundingBox) {
                        //             Array.from(boundingBox.children).forEach(child => {
                        //                 child.style.display = 'none';
                        //             });
                        //             boundingBox.style.display = "block";
                        //         }
                        //         // intialize selected element grid
                        //         if (selectElementGrid.left === 0) {
                        //             selectElementGrid.left = rect.left;
                        //             selectElementGrid.top = rect.top;
                        //             selectElementGrid.right = rect.right;
                        //             selectElementGrid.bottom = rect.bottom;
                        //         } else {
                        //             if (selectElementGrid.left > rect.left) {
                        //                 selectElementGrid.left = rect.left;
                        //             }
                        //             if (selectElementGrid.top > rect.top) {
                        //                 selectElementGrid.top = rect.top;
                        //             }
                        //             if (selectElementGrid.right < rect.right) {
                        //                 selectElementGrid.right = rect.right;
                        //             }
                        //             if (selectElementGrid.bottom < rect.bottom) {
                        //                 selectElementGrid.bottom = rect.bottom;
                        //             }
                        //         }
                        //         // elementsGrid.appendChild(el);
                        //         drawElementGrid(selectElementGrid)
                        //     }else {
                        //         if(el.classList.contains('selected')) {
                        //             el.classList.remove('selected');
                        //             let boundingBox = el.querySelector('#boundingBox');
                        //             if(boundingBox) {
                        //                 Array.from(boundingBox.children).forEach(handle => {
                        //                     handle.style.display = 'block';
                        //                 });
                        //                 boundingBox.style.display = 'none';
                        //             }
                        //         }
                        //     }
                        // });
                        //check if any element that was selected no longer selected
                        let previousSelected = document.querySelectorAll('.selected');
                        if (previousSelected) {
                            let previousSelectedArray = Array.from(previousSelected);
                            if(previousSelectedArray.length===1) {
                                elementsGrid.style.display = 'none';
                            }
                            previousSelectedArray.forEach(selected => {
                                if(selected !== elementsGrid) {
                                    let rect = selected.getBoundingClientRect();
                                    if (!(((rect.left <= left && rect.right >= left) || (rect.left >= left && rect.left <= right))
                                    && ((rect.top <= top && rect.bottom >= top) || (rect.top >= top && rect.top <= bottom)))) {
                                        let boundingBox = selected.firstElementChild;
                                        if (boundingBox) {
                                            boundingBox.style.display = 'none';
                                            Array.from(boundingBox.children).forEach(handle => {
                                                handle.style.display = 'block';
                                            });
                                        }
                                        selected.classList.remove('selected');
                                    }
                                }
                            });
                        }
                    }
                }
            })
            .on('up', function(event) {

                if (isHolding) {
                    // Your previous logic on mouseup
                    // ...
                    selectionBox.remove();
                    selectionBox = null;
                    
                    initialX = initialY = finalX = finalY = null;
                    
                    isHolding = false;
                    if(!elementsGrid.classList.contains('selected')) {
                        return;
                    }
                    var selectedElements = refGrid.querySelectorAll('.selected');
                    var distanceToSubX = (parseFloat(elementsGrid.getAttribute('data-x')) || 0);
                    var distanceToSubY = (parseFloat(elementsGrid.getAttribute('data-y')) || 0);
                    Array.from(selectedElements).forEach(selected => {
                        if(selected !== elementsGrid) {
                            elementsGrid.appendChild(selected);
                            var x = (parseFloat(selected.getAttribute('data-x')) || 0) - distanceToSubX;
                            var y = (parseFloat(selected.getAttribute('data-y')) || 0) - distanceToSubY;
                            selected.style.transform = `translate(${x}px, ${y}px)`;
                        }
                    });
                }
            });

        // Prevent default behavior for dragging and selecting on refGrid
        interact(refGrid).preventDefault('auto');

        function drawElementGrid(selectElementGrid) {
            multipleSelection = true;
            refGridRect = refGrid.getBoundingClientRect();
            var elementGrid = document.querySelector('.elementGrid');
            elementGrid.style.display = 'block';
            elementGrid.classList.add('selected');
            // if(elementGrid.style.display==='none') {
            // }
            let elX = (selectElementGrid.left-parseFloat(refGridRect.left).toFixed(2))/scale;
            let elY = (selectElementGrid.top-parseFloat(refGridRect.top).toFixed(2))/scale;
            elementsGrid.setAttribute('prev-data-x', elX);
            elementsGrid.setAttribute('prev-data-y', elY);
            elementGrid.setAttribute('data-x', elX);
            elementGrid.setAttribute('data-y', elY);
            elementGrid.style.transform = `translate(${elX}px, ${elY}px)`;
            elementGrid.style.width = ((selectElementGrid.right-selectElementGrid.left)/scale)+'px';
            elementGrid.style.height = ((selectElementGrid.bottom-selectElementGrid.top)/scale)+'px';
            
            // let previousSelected = document.querySelectorAll('.selected');
            // if (previousSelected) {
            //     Array.from(previousSelected).forEach(selected => {
            //         let rect = selected.getBoundingClientRect();
            //         if (!(((rect.left <= selectElementGrid.left && rect.right>=selectElementGrid.left) || (rect.left >= selectElementGrid.left && rect.left<=selectElementGrid.right))
            //           && ((rect.top <= selectElementGrid.top && rect.bottom>=selectElementGrid.top) || (rect.top >= selectElementGrid.top && rect.top<=selectElementGrid.bottom)))) {
            //             selected.classList.remove('selected');
            //             let boundingBox = selected.querySelector('#boundingBox');
            //             if(boundingBox) {
            //                 Array.from(boundingBox.children).forEach(handle => {
            //                     handle.style.display = 'block';
            //                 });
            //                 boundingBox.style.display = 'none';
            //             }
            //         }
            //     });
            //     // console.log('\n\n\n\nProblem');
            // }
        }

        let isPanning = false;
        let startPan = { x: 0, y: 0 };
        let accPan = { x: 0, y: 0 };

        wrapperGrid.addEventListener("mousedown", (e) => {
            if (e.button === 1) {  // Check if the middle (wheel) button is pressed
                isPanning = true;
                startPan = { x: (e.clientX/scale), y: (e.clientY/scale) };
                storeStyleBeforeChange(wrapperGrid, 'translate', lastTransform.x, lastTransform.y);
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

        refGrid.addEventListener('dblclick', event => {
            if (document.selection && document.selection.empty) {
                document.selection.empty();
              } else if (window.getSelection) {
                const selection = window.getSelection();
                selection.removeAllRanges();
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
        // closeButton.textContent = String.fromCodePoint(0x1F534);
        closeButton.textContent = 'X';
        closeButton.style.display = 'none';

        // Add an event listener to handle the close button click
        closeButton.addEventListener('click', function () {
            container.remove(); // Remove the whole container when the button is clicked
        });
        // Append the close button to the container
        container.appendChild(closeButton);

            if (f.type.startsWith('video/')) {
                showTrimModal(f.path).then(() => {
                    //stop execution here until I confirm trim or close modal
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
                    video.setAttribute('startTime', videoData.startTime);
                    video.setAttribute('endTime', videoData.endTime);
                    video.addEventListener('timeupdate', handleProgress);
                    // After adding the event listener for timeupdate, add one for play as well:
                    // video.addEventListener('play', () => startProgress(video));
                    // video.addEventListener('play', () => {
                    //     playVideoOnce(video);
                    //     // if(!runVid) {
                    //     //     video.currentTime = video.getAttribute('startTime');
                    //     //     videoData.startTime = 0;
                    //     //     videoData.endTime = 0;
                    //     //     runVid=true;
                    //     // }
                    // }, {once : true});
                    
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
                });
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
            var interactElements = [];
            interact('.draggable')
                .draggable({
                    ignoreFrom: '.vidPause',
                    inertia: true,
                    modifiers: [
                        interact.modifiers.restrictRect({
                            elementRect: { top: 0, left: 0, bottom: 1, right: 1 },
                            endOnly: true
                        }),
                        interact.modifiers.snap({
                            targets: interactElements,
                            relativePoints: [{ x: 0.5, y: 0.5 }]
                        })
                    ],
                    autoScroll: true,
                    listeners: { start: [function(event) {
                        // if I just enabled snapping
                        if(isSnappingEnabled) {
                            console.log(interactElements)
                            interactElements.length = 0; // Clear existing targets  
                            const targetRect = event.target.getBoundingClientRect();
                            const gridSnap = document.querySelector('#grid-snap');
                            const gridSnapRect = gridSnap.getBoundingClientRect();
                            interactableElements.forEach(element => {
                                if(element !== event.target){
                                    const rect = element.getBoundingClientRect();

                                    const left = (rect.left - ((targetRect.width)/2));
                                    const right = (rect.right + ((targetRect.width)/2));
                                    const top = (rect.top+(targetRect.height/2));
                                    const bottom = (rect.bottom-(targetRect.height/2));
                                    
                                    //Top Left
                                    interactElements.push({ x: left, y: top, element, range: 100 });
                                    //center Left
                                    interactElements.push({ x: left, y: (rect.top+((rect.height)/2)), element, range: 100 });
                                    //Bottom Left
                                    interactElements.push({ x: left, y: bottom, element, range: 100 });

                                    //Top Right
                                    interactElements.push({ x: right, y: top ,element, range: 100 });
                                    //center Right
                                    interactElements.push({ x: right, y: (rect.top+((rect.height)/2)) ,element, range: 100 });
                                    //Bottom Right
                                    interactElements.push({ x: right, y: bottom ,element, range: 100 });

                                    //Left Top
                                    interactElements.push({ x: rect.left + (targetRect.width/2),y: (rect.top-(targetRect.height)/2), element, range: 70 });
                                    //center Top
                                    interactElements.push({ x: (rect.left+((rect.width)/2)) ,y: (rect.top-(targetRect.height)/2), element, range: 70 });
                                    //Right Top
                                    interactElements.push({ x: (rect.right) - (targetRect.width/2) ,y: (rect.top-(targetRect.height)/2), element, range: 70 });
                                    
                                    //Left Bottom
                                    interactElements.push({ x: rect.left + (targetRect.width/2) ,y: (rect.bottom)+((targetRect.height)/2), element, range: 70 });
                                    //center Bottom
                                    interactElements.push({ x: (rect.left+((rect.width)/2)) ,y: (rect.bottom)+((targetRect.height)/2), element, range: 70 });
                                    //Right Bottom
                                    interactElements.push({ x: (rect.right) - (targetRect.width/2) ,y: (rect.bottom)+((targetRect.height)/2), element, range: 70 });

                                }

                            });
                            console.log(interactElements);
                            console.log(gridSnapRect.x);
                        }else {
                            interactElements.length = 0;
                        }
                    } ,selectListener], move: [dragMoveListener], end: [endDragListener, updateSnap] }
                })
                .resizable({
                    edges: { left: true, right: true, bottom: true, top: true },
                    // preserveAspectRatio: false,
                    // margin: 10,
                    inertia: true,
                    modifiers: [
                        interact.modifiers.restrictRect({
                            // restriction: 'parent',
                            elementRect: { top: 0, left: 0, bottom: 1, right: 1 },
                            endOnly: true
                        }),
                        interact.modifiers.restrictSize({
                            min: { width: 50, height: 50 },
                        }),
                    ],
                    listeners: { start: (event) => {
                        target = event.target;
                        undoList.push({
                            element: target,
                            property: 'resize',
                            height: target.getBoundingClientRect().height,
                            width: target.getBoundingClientRect().width,
                            x: parseFloat(target.getAttribute('data-x')),
                            y: parseFloat(target.getAttribute('data-y'))
                        });
                    } , move: resizeMoveListener, end: endResizeListener },
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
                        let boundBoxs = document.querySelectorAll("#boundingBox");
                        boundBoxs.forEach(function(boundBox) {
                            boundBox.style.display='none';
                        });
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
                //gather all the draggable elements in one array
                // to avoid multiple calls
                interactableElements.push(container);
            }

        function toggleSnapping() {
            isSnappingEnabled = !isSnappingEnabled;
        }
        ipcRenderer.on('toggle-snap-elements', toggleSnapping);

        // Hide the drop zone
        dropZone.style.opacity = '0';
        dropZone.style.width= '100%';
        dropZone.style.height= '100%';
        dropZone.style.zIndex = 0;
        return false;
    };
}

function hideAllCloseButtons() {
    let closeButtons = document.querySelectorAll('.close-button');
    let boundBoxs = document.querySelectorAll("#boundingBox");
    // boundBoxs.forEach(function(boundBox) {
    //     boundBox.style.display='none';
    // });
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
    console.log(event.target);
    selectedElement=0;
    hideAllCloseButtons();
});

function deSelectMultiElem() {
    let selectedElems = elementsGrid.children;
    Array.from(selectedElems).forEach(selected => {
        if(!selected.classList.contains('square')) {
            gridSnap.appendChild(selected);
            var distanceTraveledX = (parseFloat(elementsGrid.getAttribute('data-x')) - parseFloat(elementsGrid.getAttribute('prev-data-x'))) + parseFloat(selected.getAttribute('data-x'));
            var distanceTraveledY = (parseFloat(elementsGrid.getAttribute('data-y')) - parseFloat(elementsGrid.getAttribute('prev-data-y')) + parseFloat(selected.getAttribute('data-y')));
            selected.style.transform = `translate(${distanceTraveledX}px, ${distanceTraveledY}px)`;
            selected.setAttribute('data-x', distanceTraveledX);
            selected.setAttribute('data-y', distanceTraveledY);
            let boundingBox = selected.querySelector('#boundingBox');
            if(boundingBox) {
                Array.from(boundingBox.children).forEach(handle => {
                    handle.style.display = 'block';
                });
                boundingBox.style.display = 'none';
            }
            selected.classList.remove('selected');
            
        }
    });
    elementsGrid.style.display = 'none';
    elementsGrid.classList.remove('selected');
}

function selectListener(event) {
    var target = event.target;
    selectedElements = document.querySelectorAll('.selected');
    // storeStyleBeforeChange(event, 'transform');
    if(elementsGrid.classList.contains('selected')) {
        var selectedList = [];
        Array.from(selectedElements).forEach((element) => {
            if(element!==elementsGrid) {
                selectedList.push({
                    element: element,
                    x: parseFloat(element.getAttribute('data-x')),
                    y: parseFloat(element.getAttribute('data-y'))
                });
            }
        });
        undoList.push(selectedList);
        if(target.parentElement !== elementsGrid) {
            elementsGrid.style.display = 'none';
            deSelectMultiElem();
        }
    }else {
        storeStyleBeforeChange(target, 'translate', parseFloat(target.getAttribute('data-x')), parseFloat(target.getAttribute('data-y')));
        target.classList.add('selected');
    }
    //check if we currently select multiple elements by checking if the elementsGrid is selected.
    // if so then all the selected elements are childs of elementsGrid
    // hideAllCloseButtons();
    // console.log('\n\n\n\n\n' + target.classList);
    // let closeButton = target.querySelector('.close-button');
    // selectedElement = 0;
    // if (closeButton) {
    //     closeButton.style.display = 'block';
    //     selectedElement = event;
    //     let boundingBox = target.querySelector('#boundingBox');
    //     console.log('\n\n\n\n\n' + boundingBox.id);
    //     if (boundingBox) {
    //         boundingBox.style.display = "block";
    //     }
    //     // updateBoundingBox(event);
    //     console.log('this is where u looking for - ');
    //     console.log(event.target.getBoundingClientRect().x);
    //     console.log(event.offsetX);
    // }
    
    // if(!target.parentElement.classList.contains('selected')) {
    //     let previousSelected = document.querySelectorAll('.selected');
    //     Array.from(previousSelected).forEach(child => {
    //         let boundingBox = child.querySelector('#boundingBox');
    //         if(boundingBox) {
    //             Array.from(boundingBox.children).forEach(handle => {
    //                 handle.style.display = 'block';
    //             });
    //             boundingBox.style.display = 'none';
    //         }        
    //         child.classList.remove('selected');
    //     });
    // }
}

function dragMoveListener(event) {
    var target = event.target;
    // var wrapper = document.querySelector('.wrapper-grid');
    // // If elementGrid is the target, move all selected elements with it
    // var elementGrid = document.querySelector('.elementGrid');
    var grid = false
    isDragging = true;
    event.target.style.zIndex = ++zIndex;
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
    if(elementsGrid.classList.contains('selected')) {
        var x = (parseFloat(elementsGrid.getAttribute('data-x')) || 0) + (event.dx/scale);
        var y = (parseFloat(elementsGrid.getAttribute('data-y')) || 0) + (event.dy/scale);
        if(y>=0 && x>=0 && !isOutofBound){
            elementsGrid.style.transform = 'translate(' + x + 'px, ' + y + 'px)';
            elementsGrid.setAttribute('data-x', x);
            elementsGrid.setAttribute('data-y', y);
        }
    
        getOutOfBoundTravel(elementsGrid);
        return;
    }
    if(elementsGrid.classList.contains('selected')) {
        grid = true;
    }
    var x = (parseFloat(target.getAttribute('data-x')) || 0) + (event.dx/scale);
    var y = (parseFloat(target.getAttribute('data-y')) || 0) + (event.dy/scale);
    
    if(y>=0 && x>=0 && !isOutofBound){
        target.style.transform = 'translate(' + x + 'px, ' + y + 'px)';
        target.setAttribute('data-x', x);
        target.setAttribute('data-y', y);
        translation.x = x;
        translation.y = y;
    }

    getOutOfBoundTravel(event.target);
}

function endDragListener(event) {
    isInteracting=false;
    isDragging=false;
    getOutOfBoundTravel(event.target);
}
function endResizeListener(event) {
    isInteracting = false;
    let { target, rect } = event;
    isResize=0;
    let x = (parseFloat(target.getAttribute('data-x')) || 0);
    let y = (parseFloat(target.getAttribute('data-y')) || 0);
    if(x<0 || y<0) {
        if(x<0) {
            x=0.1;
        }else {
            y=0.1;
        }
        target.style.transform = 'translate(' + x + 'px,' + y + 'px)';
        target.setAttribute('data-x', x);
        target.setAttribute('data-y', y);
    }
    getOutOfBoundTravel(event.target);
    window.requestAnimationFrame(function() {
        resizeCanvas();
        // updateBoundingBox(event);
    });
    // updateBoundingBox(event);
}

function getOutOfBoundTravel(event) {
    var boundRect = document.getElementById('grid-snap').getBoundingClientRect();
    // var target='';
    // if(event === document.querySelector('elementGrid')) {
    //     target = event;
    // }else {
    //     target = event.target;
    // }
    var targetRect = event.getBoundingClientRect();
    //we divide by scale, since when we zoom in and out, the y and x are also scaled and so to calculate the actual distance overlap we need to divide by the scale
    lastPos.left = (boundRect.x-targetRect.x)/scale;
    lastPos.right = (targetRect.right-boundRect.right)/scale;
    lastPos.top = (boundRect.top-targetRect.top)/scale;
    lastPos.bottom = (targetRect.bottom-boundRect.bottom)/scale;
    if(lastPos.bottom>0 || lastPos.right>0) {
        resizeCanvas();
    }else {
        // updateBoundingBox(event);
    }
}

function resizeCanvas() {
    boundRect = document.getElementById('grid-snap').getBoundingClientRect();
    contStyle = document.getElementById('grid-snap').style;
    // boundBox = document.getElementById('boundingBox');
    // var boundBoxX = boundBox.getBoundingClientRect().x;
    // var boundBoxY = boundBox.getBoundingClientRect().y;
    // console.log('this is the grid y - ' + boundRect.y);
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

    target.style.top = "0px";
    
    // x += event.deltaRect.left;
    // y += event.deltaRect.top;
        
    if(x>=0 && y>=0) {
        console.log('this is y\n'+y);
        x += event.deltaRect.left;
        y += event.deltaRect.top;
        if(x>=0) {
            target.style.width = rect.width/scale + 'px';
        }
        if(y>=0) {
            target.style.height = rect.height/scale + 'px';
        }
        target.style.transform = 'translate(' + x + 'px,' + y + 'px)';
        target.setAttribute('data-x', x);
        target.setAttribute('data-y', y);
        translation.x = x;
        translation.y = y;
    }
    getOutOfBoundTravel(event.target);
    window.requestAnimationFrame(function() {
        resizeCanvas();
        // updateBoundingBox(event);
    });
}

interact('.draggable').on('tap', function (event) {
    let target = event.currentTarget;
    //check if we currently select multiple elements by checking if the elementsGrid is selected.
    // if so then all the selected elements are childs of elementsGrid
    if(target.parentElement !== elementsGrid) {
        if(elementsGrid.classList.contains('selected')) {
            deSelectMultiElem();
        }
    }
    // Hide the bounding box for any previous selected element
    let previousSelected = document.querySelectorAll('.selected');
    if (previousSelected) {
        Array.from(previousSelected).forEach(selected => {
            if(selected === target) {
                return;
            }
            selected.classList.remove('selected');
            if(multipleSelection) {
                document.querySelector('.elementGrid').style.display = 'none';
                multipleSelection = false;
            }
            let boundingBox = selected.querySelector('#boundingBox');
            if (boundingBox) {
                Array.from(boundingBox.children).forEach(handle => {
                    handle.style.display = 'block';
                });
                boundingBox.style.display = 'none';
            }
        });
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

interact('#grid-snap').on('tap', function(event) {
    // if the clicked element is not an image, hide the bounding box
    var target = event.target;
    while(target) {
        if(target.classList.contains("textboxContainer") || target.classList.contains("draggable") || target.classList.contains("player")) {
            return;
        }
        target = target.parentElement;
    }
    if (!event.target.classList.contains('draggable')) {
        //check if we currently select multiple elements by checking if the elementsGrid is selected.
        // if so then all the selected elements are childs of elementsGrid
        if(elementsGrid.classList.contains('selected')) {
            deSelectMultiElem();
            return;
        }
        let previousSelected = document.querySelectorAll('.selected');
        if (previousSelected) {
            Array.from(previousSelected).forEach(selected => {
                selected.classList.remove('selected');
                if(multipleSelection) {
                    document.querySelector('.elementGrid').style.display = 'none';
                    multipleSelection = false;
                }
                let boundingBox = selected.querySelector('#boundingBox');
                if(boundingBox) {
                    Array.from(boundingBox.children).forEach(handle => {
                        handle.style.display = 'block';
                    });
                    boundingBox.style.display = 'none';
                }
            });
            // console.log('\n\n\n\nProblem');
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
    textbox.className = 'textboxContainer';
    textbox.style.overflow = 'revert';
    textbox.style.position = 'absolute';
    
    const textarea = document.createElement('textarea');
    textarea.className = 'textbox';
    textarea.textContent = 'Note';
    textarea.disabled = 'true';

    textarea.addEventListener('dblclick', event => {
        if (document.selection && document.selection.empty) {
            document.selection.empty();
          } else if (window.getSelection) {
            const selection = window.getSelection();
            selection.removeAllRanges();
          }
    });
    textarea.addEventListener('input', function() {
        // growFont(textarea);
        const parentContainer = this.parentElement;
    
        // While content overflows vertically, increase container width
        while (this.scrollHeight > this.offsetHeight) {
            const currentWidth = parseFloat(window.getComputedStyle(parentContainer).width);
            parentContainer.style.width = (currentWidth + 10) + "px"; // increment by 10px, adjust as needed
        }
    
        // If content overflows horizontally, increase container width
        while (this.scrollWidth > this.offsetWidth) {
            const currentWidth = parseFloat(window.getComputedStyle(parentContainer).width);
            parentContainer.style.width = (currentWidth + 10) + "px"; // increment by 10px, adjust as needed
        }
    });
    // textarea.style.fontSize='100%';
    
    // Create bounding box
    let boundingBox = document.createElement('div');
    boundingBox.id = 'boundingBox';
    textbox.appendChild(boundingBox);

    // Add handles to the bounding box
    const handles = ["tl", "tm", "ml", "tr", "mr", "bl", "bm", "br"];
    handles.forEach(handle => {
        let div = document.createElement('div');
        div.className = `square handle-${handle}`;
        boundingBox.appendChild(div);
    });
    const closeButton = document.createElement('button');
    closeButton.className = 'close-button';
    // closeButton.textContent = String.fromCodePoint(0x1F534);
    closeButton.textContent = 'X';
    closeButton.style.display = 'none'; // initially, the close button is hidden
    
    const fontColorButton = document.createElement('button');
    fontColorButton.className = 'font-Color-Select';
    fontColorButton.innerHTML = 'T';
    fontColorButton.style.display='none';

    const fontButton = document.createElement('button');
    fontButton.className = 'font-Select';
    fontButton.innerHTML = 'T';
    fontButton.style.display='none';
    
    const outlineColorButton = document.createElement('button');
    outlineColorButton.className = 'outline-Color-Select';
    outlineColorButton.innerHTML = 'T';
    outlineColorButton.style.display='none';

    fontColorButton.onclick = (event) => {
        showColorPickModal(event, 'font');
    };
    fontButton.onclick = (event) => {
        showFontPickModal(event);
    };
    outlineColorButton.onclick = (event) => {
        showColorPickModal(event, 'outline');
    };

    
    closeButton.addEventListener('click', function (event) {
        event.stopPropagation(); // prevent the container click event from firing
        textbox.remove();
    });


    textbox.appendChild(fontColorButton);
    textbox.appendChild(fontButton);
    textbox.appendChild(outlineColorButton);
    textbox.appendChild(closeButton);
    textbox.appendChild(textarea);
    
    document.getElementById('grid-snap').appendChild(textbox);

    textbox.addEventListener('click', function(event) {
        event.stopPropagation(); // prevent the document click event from firing
        hideAllCloseButtons();
        let closeButton = this.querySelector('.close-button');
        if (closeButton) {
            closeButton.style.display = 'block';
            selectedElement = event;
            if(event.target.disabled) {
                let boundingBox = this.querySelector('#boundingBox');
                if(boundingBox) {
                    boundingBox.style.display = "block";
                }
            }
        }
    });

    interact('.textboxContainer')
        .draggable({
            enabled: true,
            inertia: true,
            modifiers: [
                interact.modifiers.restrictRect({
                    elementRect: { top: 0, left: 0, bottom: 1, right: 1 },
                    endOnly: true
                })
            ],
            autoScroll: true,
            listeners: { start: [disableNoteState, showBoundingBox, deSelectMultiElem] , move: [dragMoveListener], end: [endDragListener,showBoundingBox] }
        })
        .resizable({
            enabled: true,
            edges: { left: true, right: true, bottom: true, top: true },
            margin: 10,
            preserveAspectRatio: true,
            listeners: { start: [disableNoteState, showBoundingBox, deSelectMultiElem] ,move: [resizeMoveListener], end:[endResizeListener,growFont,showBoundingBox] },
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
        })//on double tap enable font editing, and show font tool tip
        .on(['doubletap'], (event) => {
            // str = JSON.stringify(event.currentTarget);
            event.preventDefault();

            console.log(event.target.parentElement.className + '\n\n\n\n');
            // growFont(event);
            event.target.disabled = false;
            const textbox = event.target.parentElement;
            textbox.querySelector('.font-Select').style.display = 'block';
            textbox.querySelector('.font-Color-Select').style.display = 'block';
            textbox.querySelector('.outline-Color-Select').style.display = 'block';
            interact('.textboxContainer').draggable({enabled:false});
            interact('.textboxContainer').resizable({ enabled: false });
            // event.target.style.pointerEvents
            //deSelectMultiElem();
            showBoundingBox(event, false)
            window.requestAnimationFrame(() => {
                showBoundingBox(event, false);
            });
            event.target.focus();
        })
        .on('tap', (event) => {
            if(event.target.disabled) {
                //check if we currently select multiple elements by checking if the elementsGrid is selected.
                // if so then all the selected elements are childs of elementsGrid
                if(elementsGrid.classList.contains('selected')) {
                    deSelectMultiElem();
                    return;
                }
                // Hide the bounding box for any previous selected element
                let previousSelected = document.querySelectorAll('.selected');
                if (previousSelected) {
                    Array.from(previousSelected).forEach(selected => {
                        selected.classList.remove('selected');
                        if(multipleSelection) {
                            document.querySelector('.elementGrid').style.display = 'none';
                            multipleSelection = false;
                        }
                        let boundingBox = selected.querySelector('#boundingBox');
                        if (boundingBox) {
                            Array.from(boundingBox.children).forEach(handle => {
                                handle.style.display = 'block';
                            });
                            boundingBox.style.display = 'none';
                        }
                    });
                }
                console.log('im the p')
                // event.target.classList.add('selected');
                showBoundingBox(event, true);
            }
        });

    document.addEventListener('click', (event) => {
        if(event.target!==textbox && !textbox.contains(event.target)) {
            if(colorModalOpen) {
                return;
            }
            interact('.textboxContainer').draggable({ enabled: true});
            interact('.textboxContainer').resizable({ enabled: true});
            disableNoteState(event);
            let boundBoxs = document.querySelectorAll("#boundingBox");
            boundBoxs.forEach(function(boundBox) {
                boundBox.style.display='none';
            });
        }
    });
}
function showBoundingBox(event, state=true) {
    var target;
    if(event.target) {
        if(event.target.className == 'textbox') {
            target = event.target.parentElement;
        }else {
            target = event.target;
        }
    }
    if(!target.classList.contains('textboxContainer')) {
        return;
    }
    var boundBox = target.querySelector('#boundingBox');
    if(state) {
        boundBox.style.display ='block';
        console.log('true\n\n\n' + boundBox);
    }else {
        boundBox.style.display ='none';
        console.log('false \n\n\n');
    }
}
function growFont(event) {
    if(!sizeRelative) {
        return;
    }
    var target = event.target;
    var textarea;
    // we do this check
    // because in font selection we send the textbox directly
    // could be optimize tho
    if(!target) {
        target = event;
        if(target.className == 'textbox') {
            textarea = event;
            target = event.parentElement;
        }else {
            textarea = target.querySelector('.textbox');
        }
    }else {
        if(target.className == 'textbox') {
            textarea = target;
            target = target.parentElement;
        }else {
            textarea = target.querySelector('.textbox');
        }
    }
    // we do this check
    // because in font selection we send the textbox directly
    // could be optimize tho
    for (let i = 10; i < 500; i++) { // max limit of 200px, can be adjusted
        textarea.style.fontSize = i + "px";

        if (textarea.scrollHeight > textarea.offsetHeight || textarea.scrollWidth > textarea.offsetWidth) {
            textarea.style.fontSize = (i - 1) + "px";
            break;
        }
    }
    // If content overflows vertically, increase container width until it fits
    while (textarea.scrollHeight > textarea.offsetHeight) {
        const currentWidth = parseFloat(window.getComputedStyle(target).width);
        target.style.width = (currentWidth + 10) + "px"; // increment by 10px, adjust as needed
    }
    
    // Adjust font size again after container width adjustment
    while (textarea.scrollHeight > textarea.offsetHeight || textarea.scrollWidth > textarea.offsetWidth) {
        const currentSize = parseInt(window.getComputedStyle(textarea).fontSize);
        textarea.style.fontSize = (currentSize - 1) + "px";
    }
    adjustAfterResize(event);
}
function adjustAfterResize(event) {
    var textarea = '';
    //because font selection we send the textbox directly could be optimize tho
    if(!event.target) {
        textarea = event;
    }else {
        textarea = event.target.querySelector('.textbox');
    }
    // Adjust font size to prevent overflow
    while (textarea.scrollHeight > textarea.offsetHeight || textarea.scrollWidth > textarea.offsetWidth) {
        const currentSize = parseInt(window.getComputedStyle(textarea).fontSize);
        textarea.style.fontSize = (currentSize - 1) + "px";
    }
    
    // If content still overflows vertically after font size adjustment, increase container width
    while (textarea.scrollHeight > textarea.offsetHeight) {
        const currentWidth = parseFloat(window.getComputedStyle(event.target).width);
        event.target.style.width = (currentWidth + 10) + "px"; 
    }
}
function disableNoteState(event) {
    const note = event.target;
    note.querySelector('.textbox').disabled = true;
    note.querySelector('.font-Select').style.display = 'none';
    note.querySelector('.font-Color-Select').style.display = 'none';
    note.querySelector('.outline-Color-Select').style.display = 'none';
    isInteracting=true;
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
function handleZoom(event) {
    
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
    if(((((targetRect.x-gridRect.x)/scale)*maxScale) + reminderWidth + scaledWidth)>window.innerWidth) {
        centerX = reminderWidth + (((((targetRect.x-gridRect.x)/scale)*maxScale) - targetRect.x)*-1) + (lastTransform.x-targetRect.x) - gridRect.x;
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
    if (video.currentTime >= video.getAttribute('endTime')) {
        video.currentTime = video.getAttribute('startTime');
    }
    if(video.currentTime <= video.getAttribute('startTime')) {
        video.currentTime = video.getAttribute('startTime');
    }
    // const percent = video.currentTime / video.duration
    const percent = (video.currentTime-video.getAttribute('startTime')) / (video.getAttribute('endTime')-video.getAttribute('startTime'));
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
        var b = parseFloat(video.getAttribute('startTime'));
        var a = parseFloat(percent * (video.getAttribute('endTime')-video.getAttribute('startTime'))).toFixed(4)
        video.currentTime = parseFloat(a) + b;
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

    if (isScrubbing) {
        e.preventDefault();
        // thumbnailImg.src = previewImgSrc
        progressBar.parentElement.style.setProperty("--progress-position", percent)
    }
}

function togglePlayPause(event) {
    const foundVideo = event.currentTarget.querySelector('video');
    var progressBar = event.currentTarget.querySelector('.progress');
    const video = foundVideo || currVid;
    if (foundVideo) {
        currVid = foundVideo;
    }
    if (video.paused && (event.target!=progressBar)) {
        console.log(event.currentTarget);
        console.log(progressBar);
        video.play();

        progressBar = video.parentElement.querySelector('.progress');
        progressBar.classList.remove('vidPause');
        console.log(progressBar.classList);
        progressBar.style.height = '7px';

    } else {
        video.pause();
        progressBar = video.parentElement.querySelector('.progress');
        progressBar.classList.add('vidPause');
        progressBar.style.height = '15px';
        
    }
}

// function openModalWithVideo(videoPath) {
//     let modal = document.getElementById("videoTrimModal");
//     let closeModalBtn = modal.querySelector(".close");
//     let videoElement = modal.querySelector("#trimVideoPlayer");
  
//     videoElement.src = videoPath;
//     modal.style.display = "block";
  
//     closeModalBtn.onclick = function() {
//       modal.style.display = "none";
//     }
  
//     // When the user clicks anywhere outside of the modal, close it
//     window.onclick = function(event) {
//       if (event.target == modal) {
//         modal.style.display = "none";
//       }
//     }
//   }

  function createTrimModalForVideo(videoPath) {
    let modal = document.createElement('div');
    modal.classList.add('modal');

    let modalContent = `
        <div class="modal-content">
            <span class="close" onclick="closeTrimModal(event)">&times;</span>
            <video muted autoplay loop src="${videoPath}"></video>
            <div class="range_container">
                <div class="time-roller">
                    <!-- Time roller will be generated here dynamically -->
                </div>
                <div class="range-sliders">
                    <span class="slider-track"></span>
                    <input type="range" class="fromInput" id="startTrim" min="0" max="100" value="0" step="0.1">
                    <input type="range" class="toInput" id="endTrim" min="0" max="100" value="100" step="0.1">
                    <div class="time-tooltip" id="timeTooltip">00:00</div>
                </div>
                <div class="video-frames">
                    <!-- Video frames will be generated here dynamically -->
                </div>
            </div>
            <div class="confirm-button-container">
                <button id="confirmTrimButton" onclick="confirmTrim(event)">Confirm trim</button>
            </div>
        </div>
    `;

    modal.innerHTML = modalContent;
    document.body.appendChild(modal);

    return modal;
}
let handleModalClosure;
function showTrimModal(videoPath, callback) {
    return new Promise((resolve, reject) => {
        handleModalClosure = () => {
            resolve();  // This assigns the resolve function for future use.
        };
        let modal = createTrimModalForVideo(videoPath);

        isModalOpen = true;
        
        modal.style.display = "block";
        modal.callback = callback;

        let videoElem = modal.querySelector('video');
        let startSlider = modal.querySelector('#startTrim');
        let endSlider = modal.querySelector('#endTrim');
        let sliderContainer = modal.querySelector('.range-sliders');
        const timeRoller = document.querySelector(".time-roller");
        const videoFrames = document.querySelector(".video-frames");
        const timeTooltip = modal.querySelector("#timeTooltip");
        const rangeTrack = modal.querySelector(".slider-track");
        var startTime = 0;
        var endTime = videoElem.duration;

        
        const rangeWidth = startSlider.offsetWidth;
        
        
        videoElem.onloadedmetadata = function() {
            startSlider.max = videoElem.duration;
            endSlider.max = videoElem.duration;
            videoData.startTime = 0;
            videoData.endTime = videoElem.duration;
            // sliderContainer.style.background = `linear-gradient(to right, rgba(218, 218, 229, 0.5) ${0}%, rgba(50, 100, 254, 0.5) ${0}%, rgba(50, 100, 254, 0.5) ${100}%, rgba(218, 218, 229, 0.5) ${100}%)`;
            generateTimeRollerAndFrames(videoElem.duration);
        };
        
        // Function to generate time roller and video frames based on video duration
        async function generateTimeRollerAndFrames(videoDuration) {
            const numberOfTicks = 10; // Adjust the number of ticks as needed
            const timeIncrement = videoDuration / numberOfTicks;

            // Clear existing content
            timeRoller.innerHTML = '';
            videoFrames.innerHTML = '';

            for (let i = 0; i <= numberOfTicks; i++) {
                const time = (i * timeIncrement).toFixed(2); // Format time to two decimal places
                const timeLabel = document.createElement("span");
                timeLabel.textContent = '| ' +time;
                timeLabel.style.left = ((10*i)+0.5) + '%';
                timeRoller.appendChild(timeLabel);

                const videoFrame = document.createElement("div");
                videoFrame.classList.add("video-frame");
                const frameDataURL = await captureFrame(videoElem, time);
                videoFrame.style.backgroundImage = `url(${frameDataURL})`;
                videoFrames.appendChild(videoFrame);
            }
        }
        


        startSlider.addEventListener('input', function() {
            if (parseFloat(startSlider.value) >= parseFloat(endSlider.value)) {
                endSlider.value = parseFloat(startSlider.value) + 0.1;
            }
            
            //color the selected range
            var percent1 = (startSlider.value / videoElem.duration) * 100;
            var percent2 = (endSlider.value / videoElem.duration) * 100;
            // sliderContainer.style.background = `linear-gradient(to right, rgba(218, 218, 229, 0.5) ${percent1}%, rgba(50, 100, 254, 0.5) ${percent1}%, rgba(50, 100, 254, 0.5) ${percent2}%, rgba(218, 218, 229, 0.5) ${percent2}%)`;
            //set the rangeTrack
            rangeTrack.style.left = percent1+'%';
            rangeTrack.style.width = ((100-percent1)-(100-percent2))+'%';
            //set the video start time
            startTime = startSlider.value;
        });

        endSlider.addEventListener('input', function() {
            if (parseFloat(endSlider.value) <= parseFloat(startSlider.value)) {
                startSlider.value = parseFloat(endSlider.value) - 0.1;
            }
            //color the selected range
            var percent1 = (startSlider.value / videoElem.duration) * 100;
            var percent2 = (endSlider.value / videoElem.duration) * 100;
            // sliderContainer.style.background = `linear-gradient(to right, rgba(218, 218, 229, 0.5) ${percent1}%, rgba(50, 100, 254, 0.5) ${percent1}%, rgba(50, 100, 254, 0.5) ${percent2}%, rgba(218, 218, 229, 0.5) ${percent2}%)`;
            //set the rangeTrack
            rangeTrack.style.left = percent1+'%';
            rangeTrack.style.width = ((100-percent1)-(100-percent2))+'%';
            //set the video end time
            endTime = endSlider.value;
        });
        //Display TimeToolTip on thumb move
        [startSlider, endSlider].forEach(slider => {
            slider.addEventListener('mousemove', function(e) {
                const value = parseFloat(slider.value);
                const percent = (value - parseFloat(slider.min)) / (parseFloat(slider.max) - parseFloat(slider.min));
                const leftOffset = percent * slider.offsetWidth;
                
                // Position the tooltip
                timeTooltip.style.left = `${leftOffset}px`;
                timeTooltip.textContent = secondsToTime(value);
                
                // Reposition tooltip if it goes out of the container's bounds
                if (leftOffset + timeTooltip.offsetWidth / 2 > sliderContainer.offsetWidth) {
                    timeTooltip.style.transform = `translateX(-100%) translateY(-100%) translateY(-10px)`;
                } else if (leftOffset - timeTooltip.offsetWidth / 2 < 0) {
                    timeTooltip.style.transform = `translateX(0%) translateY(-100%) translateY(-10px)`;
                } else {
                    timeTooltip.style.transform = `scale(0.9) translateX(-50%) translateY(-100%) translateY(-10px)`;
                }
                if (isThumbHovered(slider)) {
                    timeTooltip.style.opacity = '1';
                    timeTooltip.style.transform = 'scale(1) translateY(-100%) translateY(-10px);';
                }else {
                    timeTooltip.style.transform = 'scale(0.7) translateY(-100%) translateY(-10px)'; /* Starting scale */
                    timeTooltip.style.opacity = '0';
                }
            });
        });
        videoElem.addEventListener('timeupdate', ()=>{
            if (videoElem.currentTime >= endTime) {
                videoElem.currentTime = startTime;
            }
            if(videoElem.currentTime <= startTime) {
                videoElem.currentTime = startTime;
            }
        })

        // When the user clicks anywhere outside of the modal, close it
        window.onclick = function(event) {
            if (event.target == modal) {
                closeTrimModal(event);
            }
        }
    });
    //resolve the promise to keep execution of the code

}

function closeTrimModal(event) {
    let modal = event.target.closest('.modal');
    if (modal) {
        modal.style.display = "none";
        isModalOpen = false;
        modal.remove(); // Optionally remove the modal from the DOM entirely
        if (typeof modal.callback === 'function') {
            modal.callback();
        }
        // Then, ensure the promise from `showTrimModal` is resolved.
        handleModalClosure();
    }
}

function confirmTrim(event) {
    let modal = event.target.closest('.modal');
    let startSlider = modal.querySelector('#startTrim');
    let endSlider = modal.querySelector('#endTrim');

    videoData.startTime = startSlider.value;
    videoData.endTime = endSlider.value;

    closeTrimModal(event);
}
function playVideoOnce(video) {
    video.currentTime = video.getAttribute('startTime');
    // video.play();
    video.removeEventListener("play", playVideoOnce);
}
function secondsToTime(seconds) {
    let minutes = Math.floor(seconds / 60);
    let secs = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
function isThumbHovered(slider) {
    const computedStyle = window.getComputedStyle(slider, '::-webkit-slider-thumb');
    const boxShadow = computedStyle.boxShadow;
    console.log('this is the thumb color \n ' + computedStyle.boxShadow);
    return boxShadow !== '0 0 0 1px #C6C6C6;';
}
function captureFrame(videoElement, time) {
    return new Promise((resolve) => {
        videoElement.currentTime = time;
        videoElement.onseeked = function() {
            let canvas = document.createElement('canvas');
            canvas.width = videoElement.videoWidth;
            canvas.height = videoElement.videoHeight;
            let ctx = canvas.getContext('2d');
            ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL());  // Convert the frame to an image URL
        };
    });
}


//Color code
function showColorPickModal(event, type) {
    colorModalOpen = true;
    modal = createColorPickModal();
    const getSpectrumWrapper = () => modal.querySelector(".spectrum-wrapper");
    const opacity = modal.querySelector("#opacity");
    const previusColor = window.getComputedStyle(event.target).getPropertyValue('color');
    const previusBackgroundColor = window.getComputedStyle(event.target).getPropertyValue('background');

    
    opacity.addEventListener('input', () => {
        const opacityVal = opacity.parentElement.querySelector('opacityVal');
        opacityVal.value = opacity.value;
    });

    const spectrumRanges = [
    { from: [255, 0, 0], to: [255, 255, 0] },
    { from: [255, 255, 0], to: [0, 255, 0] },
    { from: [0, 255, 0], to: [0, 255, 255] },
    { from: [0, 255, 255], to: [0, 0, 255] },
    { from: [0, 0, 255], to: [255, 0, 255] },
    { from: [255, 0, 255], to: [255, 0, 0] }
    ];

    const findColorValue = (from, to, leftDistRatio) => {
    return Math.round(from + (to - from) * leftDistRatio);
    };

    const findRgbFromMousePosition = (event) => {
    const { left, width } = getSpectrumWrapper().getBoundingClientRect();
    const leftDistance = Math.min(Math.max(event.clientX - left, 0), width - 1);
    const rangeWidth = width / spectrumRanges.length;
    const includedRange = Math.floor(leftDistance / rangeWidth);
    const leftDistRatio = ((leftDistance % rangeWidth) / rangeWidth).toFixed(2);
    const { from, to } = spectrumRanges[includedRange];
    return {
        r: findColorValue(from[0], to[0], leftDistRatio),
        g: findColorValue(from[1], to[1], leftDistRatio),
        b: findColorValue(from[2], to[2], leftDistRatio)
    };
    };

    const darken = (color, ratio) => Math.round((1 - ratio) * color);
    const whiten = (color, ratio) => Math.round(color + (255 - color) * ratio);
    const adjustSaturation = ({ r, g, b }) => (ratio, adjustmentFn) => {
    return {
        r: adjustmentFn(r, ratio),
        g: adjustmentFn(g, ratio),
        b: adjustmentFn(b, ratio)
    };
    };

    const saturate = (rgb, e) => {
    const { top, height } = getSpectrumWrapper().getBoundingClientRect();
    const topDistance = Math.min(Math.max(e.clientY - top, 0), height);
    const topDistRatio = (topDistance / height).toFixed(2);
    if (topDistRatio > 0.5) {
        const darknessRatio = (topDistRatio - 0.5) / 0.5;
        return adjustSaturation(rgb)(darknessRatio, darken);
    }
    if (topDistRatio < 0.5) {
        const whitenessRatio = (0.5 - topDistRatio) / 0.5;
        return adjustSaturation(rgb)(whitenessRatio, whiten);
    }
    return rgb;
    };

    const rgbToHex = (r, g, b) => {
    const toHex = (rgb) => {
        let hex = Number(rgb).toString(16);
        if (hex.length < 2) {
        hex = `0${hex}`;
        }
        return hex;
    };
    const red = toHex(r);
    const green = toHex(g);
    const blue = toHex(b);
    return `#${red}${green}${blue}`;
    };

    let isMouseDown = false;

    getSpectrumWrapper().addEventListener("mousedown", (e) => {
        isMouseDown = true;
        getSpectrumWrapper().addEventListener("mousemove", onColorSelect);
    });
    
    getSpectrumWrapper().addEventListener("click", (e) =>{
        let rgb = findRgbFromMousePosition(e);
        let { r, g, b } = saturate(rgb, e);
        console.log("Selected RGB:", r, g, b);
        let hexValue = rgbToHex(r, g, b);
        let [h, s, l] = rgbToHsl(r,g,b);


        // Display the RGB and hex values
        modal.querySelector(".red").value = r;
        modal.querySelector(".green").value = g;
        modal.querySelector(".blue").value = b;
        modal.querySelector(".hue").value = h;
        modal.querySelector(".saturation").value = s;
        modal.querySelector(".lightness").value = l;
        
        //set color Block with previous and current color.
        setColor(`rgba(${r},${g},${b},${opacity.value})`, previusColor, modal);
        // document.querySelector(".hex").innerText = hexValue;

        // Position and display the marker
        const colorPointer = modal.querySelector(".color-pointer");
        const xPosition = e.clientX - getSpectrumWrapper().getBoundingClientRect().left;
        colorPointer.style.left = `${xPosition}px`;
        colorPointer.style.display = "block";
        setColorSlider({r,g,b}, previusColor, modal, event, type);
        updateFontColor(event,opacity,modal, type);
    });
    // Logic that's executed during mouse drag.
    function onColorSelect(e) {
        if (!isMouseDown) return;

        let rgb = findRgbFromMousePosition(e);
        let { r, g, b } = saturate(rgb, e);
        console.log("Selected RGB:", r, g, b);
        let hexValue = rgbToHex(r, g, b);
        let [h, s, l] = rgbToHsl(r,g,b);


        // Display the RGB and hex values
        modal.querySelector(".red").value = r;
        modal.querySelector(".green").value = g;
        modal.querySelector(".blue").value = b;
        modal.querySelector(".hue").value = h;
        modal.querySelector(".saturation").value = s;
        modal.querySelector(".lightness").value = l;
        
        //set color Block with previous and current color.
        setColor(`rgba(${r},${g},${b},${opacity.value})`, previusColor, modal);
        // document.querySelector(".hex").innerText = hexValue;

        // Position and display the marker
        const colorPointer = modal.querySelector(".color-pointer");
        const xPosition = e.clientX - getSpectrumWrapper().getBoundingClientRect().left;
        colorPointer.style.left = `${xPosition}px`;
        colorPointer.style.display = "block";
        setColorSlider({r,g,b}, previusColor, modal, event, type);
        updateFontColor(event,opacity,modal, type);
    }

    getSpectrumWrapper().addEventListener("mouseup", () => {
        isMouseDown = false;
        
        // Remove mousemove event listener when mouse is released.
        getSpectrumWrapper().removeEventListener("mousemove", onColorSelect);
    });
    //update 
    const updateRgbColors = (r, g, b, opacity) => {
        //update color block
        // var { r, g, b } = saturate(rgb, e);
        setColor(`rgba(${r},${g},${b},${opacity})`, previusColor, modal);
        // let hexValue = rgbToHex(r, g, b);
        let [h, s, l] = rgbToHsl(r,g,b);

        // update the HSL values
        modal.querySelector(".hue").value = h;
        modal.querySelector(".saturation").value = s;
        modal.querySelector(".lightness").value = l;
        // update dark to light range
        setColorSlider({r,g,b}, previusColor, modal, event, type);
        moveColorPointer(h,s,l);
    };
    //update by HSL
    const updateHslColors = (h, s, l, opacity) => {
        //update color block
        var h = (parseFloat(h) || 0) / 360;
        let {r, g, b} = hslToRgb(h,s,l);
        setColor(`rgba(${r},${g},${b},${opacity})`, previusColor, modal);
        // let hexValue = rgbToHex(r, g, b);

        // update the RGB values
        modal.querySelector(".red").value = r;
        modal.querySelector(".green").value = g;
        modal.querySelector(".blue").value = b;
        // update dark to light range
        setColorSlider({r,g,b}, previusColor, modal, event, type);
        moveColorPointer(h,s,l);
    };
    
    ["hue", "saturation", "lightness"].forEach(color => {
        modal.querySelector(`.${color}`).addEventListener("input", (e) => {
            let h = parseInt(modal.querySelector(".hue").value) || 0;
            let s = parseInt(modal.querySelector(".saturation").value) || 0;
            let l = parseInt(modal.querySelector(".lightness").value) || 0;
        
            
            updateHslColors(h, s, l, opacity.value);
            updateFontColor(event,opacity,modal, type);
        });
    });
    ["red", "green", "blue"].forEach(color => {
        modal.querySelector(`.${color}`).addEventListener("input", (e) => {
            let r = parseInt(modal.querySelector(".red").value) || 0;
            let g = parseInt(modal.querySelector(".green").value) || 0;
            let b = parseInt(modal.querySelector(".blue").value) || 0;
        
            
            updateRgbColors(r, g, b, opacity.value);
            updateFontColor(event,opacity,modal, type);
        });
    });
    const saveButton = modal.querySelector('.saveButton');
    const cancelButton = modal.querySelector('.cancelButton');
    saveButton.addEventListener('click', ()=>{
        updateFontColor(event,opacity,modal, type);
        closeColorModal(modal);
    });
    cancelButton.addEventListener('click', ()=>{
        event.target.style.color = previusColor;
        event.target.parentElement.querySelector('.textbox').style.color = previusColor;
        closeColorModal(modal);
    });
    // opacity.addEventListener('input', ()=>{
    //     const r = modal.querySelector('.red').value = rgba.r;
    //     const g = modal.querySelector('.green').value = rgba.g;
    //     const b = modal.querySelector('.blue').value = rgba.b;
    //     var a = opacity.value;
    //     setColor(`rgba(${r},${g},${b},${a})`, previusColor, modal);
    //     setColorSlider({r,g,b,a}, previusColor, modal, event);

    // });

    //if the user clicks anywhere else but the color selection modal
    // update -- currently I've set it so only the coresponding button will change, and so the forEach is not needed
    // since we're only changing a trait of a single button
    // but if you want to change all the buttons
    // all you need to do is uncomment from noteContainer in
    // updateFontColor()
    window.onclick = function(e) {
        if (e.target == modal) {
            if(type==='font') {
                event.target.parentElement.querySelectorAll('button').forEach(function(button) {
                    button.style.color = previusColor;
                });
                event.target.parentElement.querySelector('.textbox').style.color = previusColor;
            }
            else if (type === 'outline') {
                event.target.parentElement.querySelectorAll('button').forEach(function(button) {
                    button.style.background = previusBackgroundColor;
                });
                event.target.parentElement.querySelector('.textbox').style.background = previusBackgroundColor;
            }
            closeColorModal(modal);
        }
    }

    //init modal
    var rgba = toRGBA(previusColor);
    modal.querySelector('.red').value = rgba.r;
    modal.querySelector('.green').value = rgba.g;
    modal.querySelector('.blue').value = rgba.b;
    updateRgbColors(rgba.r,rgba.g,rgba.b,rgba.a);
    opacity.value = rgba.a;
    modal.querySelector('#opacityVal').placeholder = rgba.a
}
function updateFontColor(event, opacity, modal, type) {
    const r = modal.querySelector('.red').value;
    const g = modal.querySelector('.green').value;
    const b = modal.querySelector('.blue').value;
    const noteContainer = event.target.parentElement;
    const note = noteContainer.querySelector('.textbox');
    // noteContainer.querySelectorAll('button').forEach(function(button) {
    //     if(type==='font') {
    //         button.style.color = `rgba(${r},${g},${b},${opacity.value})`;
    //     }
    //     else if(type==='outline') {
    //         button.style.background = `rgba(${r},${g},${b},${opacity.value})`;
    //     }
    // });
    if(type==='font') {
        note.style.color = `rgba(${r},${g},${b},${opacity.value})`;
        event.target.style.color = `rgba(${r},${g},${b},${opacity.value})`;
    }
    else if(type==='outline') {
        note.style.background = `rgba(${r},${g},${b},${opacity.value})`;
        event.target.style.background = `rgba(${r},${g},${b},${opacity.value})`;
    }
}
function closeColorModal(modal) {
    colorModalOpen=false;
    modal.remove();
}
function toRGBA(colorStr) {
    // Check for HEX format (#FFF or #FFFFFF)
    let hexMatch = colorStr.match(/^#([a-fA-F0-9]{3,6})$/);
    
    // Check for RGB format (rgb(r, g, b))
    let rgbMatch = colorStr.match(/^rgb\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})\)$/);
    
    // Check for RGBA format (rgba(r, g, b, a))
    let rgbaMatch = colorStr.match(/^rgba\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3}),\s*(\d*\.?\d+)\)$/);

    if (hexMatch) {
        let hex = hexMatch[1];

        // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
        if (hex.length === 3) {
            hex = hex.split('').map(char => char + char).join('');
        }

        let bigint = parseInt(hex, 16);
        let r = (bigint >> 16) & 255;
        let g = (bigint >> 8) & 255;
        let b = bigint & 255;

        return {r, g, b, a: 1};
    } else if (rgbMatch) {
        let [_, r, g, b] = rgbMatch.map(Number);
        return {r, g, b, a: 1};
    } else if (rgbaMatch) {
        let [_, r, g, b, a] = rgbaMatch.map(val => parseFloat(val));
        return {r, g, b, a};
    } else {
        throw new Error('Unsupported color format.');
    }
}


//create color picker modal
function createColorPickModal () {
    let modal = document.createElement('div');
    modal.classList.add('modal-color');
    let colorPickModalContent = `
    <div class="modal-content-color">
        <div class="spectrum-wrapper">
            <div class="spectrum-layer"></div>
            <div class="saturation-white"></div>
            <div class="saturation-black"></div>
            <div class="color-pointer"></div> <!-- Marker/pointer -->
        </div>
        <input type="range" min="0" max="100" value="50" class="color-slider">
        <div class="color-details"> 
            <div class="CurrentColorBlock"></div>
            <div class="color-inputs">
                <div class="color-row">
                    <label for="red">R:</label><input type="number" name="red" class="red">
                    <label for="hue">H:</label><input type="number" name="hue" class="hue">
                </div>
                <div class="color-row">
                    <label for="green">G:</label><input type="number" name="green" class="green">
                    <label for="saturation">S:</label><input type="number" name="saturation" class="saturation">
                </div>
                <div class="color-row">
                    <label for="blue">B:</label><input type="number" name="blue" class="blue">
                    <label for="lightness">L:</label><input type="number" name="lightness" class="lightness">
                </div>
            </div>
        </div>
        <form class="opacity-range">
            <label for="opacity">Opacity:</label>
            <input type="range" id="opacity" name="opacity" min="0" max="1" step="0.01" oninput="this.nextElementSibling.value = this.value"><input type="text" id="opacityVal" disabled>
        </form>
        <div class="colorButtons">
            <button class="saveButton">Save</button>
            <button class="cancelButton">Cancel</button>
        </div>
    </div>
    `;

    modal.innerHTML = colorPickModalContent;
    document.body.appendChild(modal);

    return modal;
}
function lerpColor(color1, color2, factor) {
    const r = Math.round(color1.r + factor * (color2.r - color1.r));
    const g = Math.round(color1.g + factor * (color2.g - color1.g));
    const b = Math.round(color1.b + factor * (color2.b - color1.b));
    return { r, g, b };
}

function setColorSlider(baseColor, previusColor, modal, event, type) {
    const { r, g, b } = baseColor;
    
    // Dark shade
    const dark = { r: Math.round(r * 0.3), g: Math.round(g * 0.3), b: Math.round(b * 0.3) };
    // Bright shade
    const bright = { r: Math.min(r + Math.round((255 - r) * 0.7), 255), g: Math.min(g + Math.round((255 - g) * 0.7), 255), b: Math.min(b + Math.round((255 - b) * 0.7), 255) };

    const slider = modal.querySelector('.color-slider');
    slider.style.background = `linear-gradient(to right, rgb(${dark.r}, ${dark.g}, ${dark.b}), rgb(${r}, ${g}, ${b}), rgb(${bright.r}, ${bright.g}, ${bright.b}))`;

    return slider.oninput = function() {
        const factor = this.value / 100;
        const selectedColor = lerpColor(factor <= 0.5 ? dark : baseColor, factor <= 0.5 ? baseColor : bright, factor <= 0.5 ? factor * 2 : (factor - 0.5) * 2);
        console.log('from here is testing \n')
        console.log(lerpColor({r: 0, g: 0, b: 0}, {r: 255, g: 255, b: 255}, 0));   // should be {r: 0, g: 0, b: 0}
        console.log(lerpColor({r: 0, g: 0, b: 0}, {r: 255, g: 255, b: 255}, 0.5)); // should be {r: 128, g: 128, b: 128}
        console.log(lerpColor({r: 0, g: 0, b: 0}, {r: 255, g: 255, b: 255}, 1));   // should be {r: 255, g: 255, b: 255}

        // console.log(selectedColor); // this is your selected color based on slider position
        
        // Update color inputs
        modal.querySelector('.red').value = selectedColor.r;
        modal.querySelector('.green').value = selectedColor.g;
        modal.querySelector('.blue').value = selectedColor.b;
        const [h, s, l] = rgbToHsl(selectedColor.r,selectedColor.g,selectedColor.b);
        modal.querySelector('.hue').value = h;
        modal.querySelector('.saturation').value = s;
        modal.querySelector('.lightness').value = l;
        var opacity = modal.querySelector('#opacity');
        // Also move the color pointer based on the newly selected color
        moveColorPointer(h, s, l);
        setColor(`rgba(${selectedColor.r},${selectedColor.g},${selectedColor.b},${opacity.value})`, previusColor, modal)
        updateFontColor(event, opacity, modal, type);
        return selectedColor;
    };
}
function rgbToHsl(r, g, b) {
    r /= 255, g /= 255, b /= 255;
    let max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max == min) {
        h = s = 0;  // achromatic
    } else {
        let d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return [h, s, l];
}
function hslToRgb(h, s, l) {
    // let h = (parseFloat(h) || 0) / 360;
    const hueToRgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
    };

    s = s / 100;
    l = l / 100;
    let r, g, b;

    if (s === 0) {
        r = g = b = l; // achromatic
    } else {
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hueToRgb(p, q, h + 1 / 3);
        g = hueToRgb(p, q, h);
        b = hueToRgb(p, q, h - 1 / 3);
    }

    return {
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255)
    };
}
function setColor(newColor, previousColor, modal) {
    const currentColorDiv = modal.querySelector('.CurrentColorBlock');
    console.log('this is the new color ' + newColor);
    console.log('this is the prev color' + previousColor);
    currentColorDiv.style.background = `linear-gradient(to left, ${newColor} 50%, ${previousColor} 50%)`;
}

function moveColorPointer(h, s, l) {// @param is equal to (r,g,b) or (h,s,l) if we have the updated hsl values
    // // Convert RGB to HSL
    // let [h, s, l] = rgbToHsl(r, g, b);

    // Calculate position based on hue and saturation
    const spectrumWrapper = document.querySelector(".spectrum-wrapper");
    const spectrumWidth = spectrumWrapper.offsetWidth;
    const spectrumHeight = spectrumWrapper.offsetHeight;
    const leftPosition = (h / 360) * spectrumWidth;
    const topPosition = (1 - s / 100) * spectrumHeight; // Assuming top is 0% saturation and bottom is 100%

    // Move the color-pointer
    const colorPointer = document.querySelector(".color-pointer");
    colorPointer.style.left = `${leftPosition}px`;
    colorPointer.style.top = `${topPosition}px`;
}

function createFontModal() {
    let modal = document.createElement('div');
    modal.classList.add('modal-font');
    let fontPickModalContent = `
        <div class="modal-content-font">
            <div class="font-list-wrap">
                <span class="font-label">Font Style:</span>
                <div class="font-list">
                    <div class="font-list-item" id="recent-fonts" style="display:none;">
                    </div>
                    <div class="font-list-item" style="height:20px;"></div>
                    <div class="font-list-item" style="font-family: Arial;">Arial</div>
                    <div class="font-list-item" style="font-family: Verdana;">Verdana</div>
                    <div class="font-list-item" style="font-family: 'Times New Roman';">Times New Roman</div>
                    <div class="font-list-item" style="font-family: Tahoma;">Tahoma</div>
                    <div class="font-list-item" style="font-family: 'Trebuchet MS';">Trebuchet MS</div>
                    <div class="font-list-item" style="font-family: 'Georgia';">Georgia</div>
                    <div class="font-list-item" style="font-family: 'Courier New';">Courier New</div>
                    <div class="font-list-item" style="font-family: 'Lucida Sans Unicode';">Lucida Sans Unicode</div>
                    <div class="font-list-item" style="font-family: 'Arial Black';">Arial Black</div>
                    <div class="font-list-item" style="font-family: 'Comic Sans MS';">Comic Sans MS</div>
                    <div class="font-list-item" style="font-family: Impact;">Impact</div>
                    <div class="font-list-item" style="font-family: 'Palatino Linotype';">Palatino Linotype</div>
                    <div class="font-list-item" style="font-family: 'Book Antiqua';">Book Antiqua</div>
                    <div class="font-list-item" style="font-family: 'Century Gothic';">Century Gothic</div>
                    <div class="font-list-item" style="font-family: 'Lucida Console';">Lucida Console</div>
                    <div class="font-list-item" style="font-family: 'Gill Sans MT';">Gill Sans MT</div>
                    <div class="font-list-item" style="font-family: 'Franklin Gothic Medium';">Franklin Gothic Medium</div>
                    <div class="font-list-item" style="font-family: 'Consolas';">Consolas</div>
                    <div class="font-list-item" style="font-family: 'Cambria';">Cambria</div>
                    <div class="font-list-item" style="font-family: 'Candara';">Candara</div>
                    <div class="font-list-item" style="font-family: 'Baskerville';">Baskerville</div>
                    <!-- ... and even more fonts as needed -->
                </div>
            </div>
            <div class="font-wrapper">
                <form id="app-cover" class="font-style">
                    <label class="font-label" for="font-style">Font Style:</label>
                    <div class="style-list">
                        <div class="font-list-item" style="height:18px;"></div>
                        <div class="font-list-item" style="font-style:normal;">Regular</div>
                        <div class="font-list-item" style="font-style:italic;">Italic</div>
                        <div class="font-list-item" style="font-weight:bold;">Bold</div>
                        <div class="font-list-item" style="font-style:italic; font-weight:bold;">Bold Italic</div>
                    </div>
                    
                </form>
                <div class="font-size">
                    <label class="font-label" for="fontSize">Font Size:</label>
                    <span class="font-size-display"></span>
                    <input type="range" min="10" max="118" id="fontSize">

                    <label class="form-control size" style="margin-top:14px;">
                        <input type="checkbox" name="checkbox" />
                        size relative to container
                    </label>
                </div>
            </div>
            <div class="font-effects">
                <form class="form-effects" action="">
                    <label class="form-control">
                    <input type="checkbox" name="checkbox" />
                    Strikethrough
                    </label>

                    <label class="form-control">
                    <input type="checkbox" name="checkbox" />
                    Superscript
                    </label>

                    <label class="form-control">
                    <input type="checkbox" name="checkbox" />
                    Underlined
                    </label>

                    <label class="form-control">
                    <input type="checkbox" name="checkbox" />
                    Overlined
                    </label>
                    
                    <div class="caps-effects">
                        <label class="form-control">
                        <input type="checkbox" name="checkbox" />
                        Small caps
                        </label>

                        <label class="form-control">
                        <input type="checkbox" name="checkbox" />
                        All caps
                        </label>
                    </div>
                </form>
            </div>

            <div class="paragraph-options">
                <span class = "paragraph-options-header">Paragraph options:</span>
                <div class="text-alignment"> 
                    <span class = "text-aligment-header">Text Aligment:</span>
                    <button class="align-left"></button>
                    <button class="align-center"></button>
                    <button class="align-right"></button>
                    <button class="align-justify"></button>
                </div>
                <div class="line-height">
                    <label for="lineHeight" style="grid-column: 1; grid-row: 1; align-self: self-end;">Line Height:</label>
                    <span class="lineHeightVal">val</span>
                    <input type="range" id="lineHeight" min="1" max="3" step="0.1">
                </div>
                <div class="p-padding">
                    <label for="padding-font" style="grid-row: 1; grid-column: 1/3;">Padding:</label>
                    <div class="padding-list">
                        <div class="padding-direction" style="height:20px;">All</div>
                        <div class="padding-direction">All</div>
                        <div class="padding-direction">Right</div>
                        <div class="padding-direction">Left</div>
                        <div class="padding-direction">Top</div>
                        <div class="padding-direction">Bottom</div>
                    </div>
                    <input type="number" id="padding-font" value="0" min="-420" max="420">
                </div>
            </div>

            <div class="preset-section">
                <span class="preset-header">Presets</span>
                <button class="save-preset-btn">Save Current as Preset</button>
                <div class="preset-list">
                    <div class="preset-item">NaN
                    </div>
                    <div class="preset-item">NaN
                    </div>
                    <div class="preset-item">NaN
                    </div>
                    <div class="preset-item">NaN
                    </div>
                    <div class="preset-item">NaN
                    </div>
                    <div class="preset-item">NaN
                    </div>
                    <div class="preset-item">NaN
                    </div>
                    <!-- Dynamically populate with user's saved presets -->
                </div>
            </div>

            <div class="font-preview">
                <div class="preview-box">
                    <span class="preview-box-font">Preview</span>
                </div>
            </div>
            <div class="font-modal-close-buttons">
                <button class="saveButton my-btn-dark-theme">Save</button>
                <button class="cancelButton my-btn-dark-theme">Cancel</button>
            </div>
        </div>
    `
    modal.innerHTML = fontPickModalContent;
    document.body.appendChild(modal);
    return modal;
}
function showFontPickModal(event) {
    colorModalOpen = true;
    var currentPaddingPos = 'All';
    modal = createFontModal();
    var openedElement = 'none';
    var currentFont = window.getComputedStyle(event.target).getPropertyValue('font-family');
    const previousFont = currentFont;

    var currentStyle = {style: window.getComputedStyle(event.target).getPropertyValue('font-style') , weight: window.getComputedStyle(event.target).getPropertyValue('font-weight')}
    const previousStyle = currentStyle;
    const currentFontColor = window.getComputedStyle(event.target).getPropertyValue('color');
    const currentBackground = window.getComputedStyle(event.target).getPropertyValue('background');
    
    const fontList = modal.querySelector('.font-list');
    const styleList = modal.querySelector('.style-list');
    const paragraphOptions = modal.querySelector('.paragraph-options');
    const paddingList = paragraphOptions.querySelector('.padding-list');
    const fontSizeRange = modal.querySelector('#fontSize');
    
    fontSizeRange.value = window.getComputedStyle(event.target).getPropertyValue('font-size');
    fontSizeRange.previousElementSibling.innerHTML = fontSizeRange.value + 'px';
    
    const previousSize = fontSizeRange.value;
    
    const fontEffects = modal.querySelector('.form-effects');
    const fontPreview = modal.querySelector('.font-preview');
    const buttons = modal.querySelector('.font-modal-close-buttons');
    const noteContainer = event.target.parentElement;
    const note = noteContainer.querySelector('.textbox');
    
    fontPreview.querySelector('.preview-box').style.background = window.getComputedStyle(note).getPropertyValue('background');
    fontPreview.querySelector('.preview-box-font').style.color = window.getComputedStyle(note).getPropertyValue('color');
    console.log(event.target);
    modal.addEventListener('click', (event) => {
        if(event.target.parentElement.className===openedElement) {
            return;
        }
        if(openedElement==='font-list') {
            fontList.style.height = '41.8px';
            fontList.scrollTo(0,0);
            fontList.style.overflowY = 'hidden';
            openedElement = 'none';
        }
        else if (openedElement === 'style-list') {
            styleList.style.height = '39.87px';
            styleList.scrollTo(0,0)
            styleList.style.overflowY = 'hidden';
            openedElement = 'none';
        }
        else if (openedElement === 'padding-list') {
            paddingList.style.height = '41.8';
            paddingList.scrollTo(0,0)
            paddingList.style.overflowY = 'hidden';
            openedElement = 'none';
        }
    });

    fontList.addEventListener('click', (event) => {
        const target = event.target;
        openedElement = 'font-list';
        if((target.innerHTML === '')) {
            target.style.display='none';
            fontList.style.height = '210px';
            fontList.style.overflowY = 'auto';
            // fontList.style.height = '11.1vh';
        }else if((target === fontList.children[1])) {
            // fontList.style.height = '11.1vh';
            fontList.style.height = '210px';
            target.style.display='none';
            fontList.style.overflowY = 'auto';
        }
        
        else {
            currentFont = window.getComputedStyle(target).getPropertyValue('font-family');
            fontList.children[1].style.display = 'block';
            fontList.children[1].innerHTML = target.innerHTML;
            // fontList.style.height = '2.22vh';
            fontList.style.height = '41.8px';
            fontList.scrollTo(0,0);
            fontList.style.overflowY = 'hidden';
            openedElement = 'none';
            updateFont('font', true, target);
        }
    });

    styleList.addEventListener('click', (event) => {
        const target = event.target;
        openedElement = 'style-list';
        if ((target.innerHTML === '')) {
            target.style.display = 'none';
            // styleList.style.height = '8.9vh';
            styleList.style.height = '159.52px';
            styleList.style.overflowY = 'auto';
        } else if ((target === styleList.children[0])) {
            // styleList.style.height = '8.9vh';
            styleList.style.height = '159.52px';
            styleList.style.overflowY = 'auto';
            target.style.display = 'none';
        } else {
            const fontStyle = window.getComputedStyle(target).getPropertyValue('font-style');
            const fontWeight = window.getComputedStyle(target).getPropertyValue('font-weight');
            
            if (fontWeight === "700") { // This assumes bold is represented as "700". Adjust if necessary.
                currentStyle.weight = "bold";
            } else {
                currentStyle.weight = "normal";
            }
    
            if (fontStyle === "italic" || fontStyle === "normal") {
                currentStyle.style = fontStyle;
            }
    
            styleList.children[0].style.display = 'block';
            styleList.children[0].innerHTML = target.innerHTML;
            // styleList.style.height = '2.1vh';
            styleList.style.height = '39.87px';
            styleList.scrollTo(0,0)
            styleList.style.overflowY = 'hidden';
            openedElement = 'none';
            updateFont('style', true, target);
        }
    });

    fontSizeRange.addEventListener('input', (e)=> {
        fontSizeRange.previousElementSibling.innerHTML = fontSizeRange.value + 'px';
        updateFont('size', true, e.target);
    });
    fontSizeRange.parentElement.querySelector('input[type="checkbox"]').addEventListener('change', function() {
        if(this.checked) {
            sizeRelative = true;
            growFont(note);
        }else {
            sizeRelative = false;
        }
    });

    const effects = fontEffects.querySelectorAll('.form-control');
    effects.forEach((effect) => {
        if(effect.parentElement.className==='form-effects') {
            console.log('\n\n\n'+effect.querySelector('input[type="checkbox"]'));
            effect.querySelector('input[type="checkbox"]').addEventListener('change', function() {
                if(this.checked) {
                    updateFont(effect.innerHTML, true, effect);
                }else {
                    console.log('\n\n\nno' + effect.innerHTML.slice(22,effect.innerHTML.length));
                    updateFont(effect.innerHTML, false, effect);
                }
            });
        } else {
            effect.querySelector('input[type="checkbox"]').addEventListener('change', function() {
                if(this.checked) {
                    if(effect.innerHTML.includes('Small')) {
                        effect.nextElementSibling.querySelector('input[type="checkbox"]').checked = false;
                        updateFont('All caps', false, effect);
                        updateFont(effect.innerHTML, true, effect);
                    }else {
                        effect.previousElementSibling.querySelector('input[type="checkbox"]').checked = false;
                        updateFont('Small caps', false, effect);
                        updateFont(effect.innerHTML, true, effect);
                    }
                }else {
                    updateFont(effect.innerHTML, false, effect);
                }
            });
        }
    });

    paragraphOptions.querySelectorAll('button').forEach((button) => {
        button.addEventListener('click', () => {
            const textAlignPos = button.className.slice(6);
            const preview = fontPreview.querySelector('.preview-box-font');
            event.target.style.textAlign = textAlignPos;
            note.style.textAlign = textAlignPos;
            preview.parentElement.style.justifyContent = textAlignPos;
        });
    });
    paragraphOptions.querySelector('#lineHeight').addEventListener('input', (e) =>{
        const preview = fontPreview.querySelector('.preview-box-font');
        
        e.target.previousElementSibling.innerHTML = e.target.value;
        note.style.lineHeight = e.target.value;
        preview.style.lineHeight = e.target.value;
    });
    paddingList.addEventListener('click', (event) =>{
        const target = event.target;
        openedElement = 'padding-list';
        if((target.innerHTML === '')) {
            target.style.display='none';
            paddingList.style.height = '252px';
            paddingList.style.overflowY = 'auto';
        }else if((target === paddingList.children[0])) {
            paddingList.style.height = '252px';
            // target.style.display='none';
            paddingList.style.overflowY = 'auto';
        }
        
        else {
            currentFont = window.getComputedStyle(target).getPropertyValue('font-family');
            paddingList.children[0].style.display = 'block';
            paddingList.children[0].innerHTML = target.innerHTML;
            // fontList.style.height = '2.22vh';
            paddingList.style.height = '41.8px';
            paddingList.scrollTo(0,0);
            paddingList.style.overflowY = 'hidden';
            openedElement = 'none';
            
            padding = paragraphOptions.querySelector('#padding-font');
            currentPaddingPos = target.innerHTML;
            switch(currentPaddingPos) {
                case 'All':
                if(note.style.padding === '') {
                    padding.value = 0;
                }else {
                    padding.value = note.style.padding.replace('px', '');
                }
                break;
                case 'Right':
                if(note.style.paddingRight === '') {
                    padding.value = 0;
                }else {
                    padding.value = note.style.paddingRight.replace('px', '');
                }
                break;
                case 'Left':
                if(note.style.paddingLeft === '') {
                    padding.value = 0;
                }else {
                    padding.value = note.style.paddingLeft.replace('px', '');
                }
                break;
                case 'Top':
                if(note.style.paddingTop === '') {
                    padding.value = 0;
                }else {
                    padding.value = note.style.paddingTop.replace('px', '');
                }
                break;
                case 'Bottom':
                if(note.style.paddingBottom === '') {
                    padding.value = 0;
                }else {
                    padding.value = note.style.paddingBottom.replace('px', '');
                }
                break;
            }
        }
    });
    paragraphOptions.querySelector('#padding-font').addEventListener('input', (e) => {
        const preview = fontPreview.querySelector('.preview-box-font');
        if(currentPaddingPos==='All') {
            note.style.padding = e.target.value+'px';
        }
        else {
            switch(currentPaddingPos) {
                case 'Right': 
                note.style.paddingRight = e.target.value+'px';
                preview.style.paddingRight = e.target.value+'px';
                break;
                case 'Left':
                note.style.paddingLeft = e.target.value+'px';
                preview.style.paddingLeft = e.target.value+'px';
                break;
                case 'Top':
                note.style.paddingTop = e.target.value+'px';
                preview.style.paddingTop = e.target.value+'px';
                break;
                case 'Bottom':
                note.style.paddingBottom = e.target.value+'px';
                preview.style.paddingBottom = e.target.value+'px';
                break;
            }
        }
    });

    buttons.addEventListener('click', (event) => {
        if (event.target.innerHTML==='Save') {
            closeFontModal(modal);
        }
        else if (event.target.innerHTML==='Cancel') {
            updateFont('all', false, event.target);
            closeFontModal(modal);
        }
    });

    function updateFont(param ,flag, target) {
        const preview = fontPreview.querySelector('.preview-box-font');      
        if(param==='all') {
            //revert 
            //=======
            //font
            event.target.style.fontFamily = `${previousFont}`;
            note.style.fontFamily = `${previousFont}`;
            // size
            note.style.fontSize = ` ${previousSize}px`;
            //style
            event.target.style.fontStyle = `${previousStyle.style}`;
            note.style.fontStyle = `${previousStyle.style}`;
            //weight
            event.target.style.fontWeight = `${previousStyle.weight}`;
            note.style.fontWeight = `${previousStyle.weight}`;
        }
        if(flag) {
            if(param==='font') {
                console.log('font\n\n\n');
                event.target.style.fontFamily = `${currentFont}`;
                note.style.fontFamily = `${currentFont}`;
                preview.style.fontFamily = `${currentFont}`;
            }
            else if(param==='size') {
                // event.target.style = `font-size: ${fontSizeRange.value}px`;
                note.style.fontSize = `${fontSizeRange.value}px`;
                preview.style.fontSize = `${fontSizeRange.value}px`;
            }
            else if(param==='style') {
                console.log(currentStyle);
                //style
                event.target.style.fontStyle = `${currentStyle.style}`;
                note.style.fontStyle = `${currentStyle.style}`;
                preview.style.fontStyle = `${currentStyle.style}`;
                //weight
                event.target.style.fontWeight = `${currentStyle.weight}`;
                note.style.fontWeight = `${currentStyle.weight}`;
                preview.style.fontWeight = `${currentStyle.weight}`;
            }
            else{
                if(param.includes('Strikethrough')) {
                    console.log('nigger\n\n\n' + event.target.style.textDecorationLine)
                    ef = event.target.style.textDecorationLine.concat(' ', `line-through`);
                    console.log('nigger\n\n\n' + ef)
                    event.target.style.textDecorationLine = ef;
                    note.style.textDecorationLine = ef;
                    preview.style.textDecorationLine = ef;
                }
                if(param.includes('Superscript')) {
                    event.target.style.verticalAlign = `super`;
                    note.style.verticalAlign = `super`;
                    preview.style.verticalAlign = `super`;

                    note.style.fontSize = `0.8em`;
                    preview.style.fontSize = `0.8em`;
                    fontSizeRange.disabled=true;

                    note.style.lineHeight = `1`;
                    preview.style.lineHeight = `1`;
                    paragraphOptions.querySelector('#lineHeight').disabled = true;
                    
                }
                if(param.includes('Underlined')) {
                    ef = event.target.style.textDecorationLine.concat(' ', `underline`);
                    event.target.style.textDecorationLine = ef;
                    note.style.textDecorationLine = ef;
                    preview.style.textDecorationLine = ef;
                    
                }
                if(param.includes('Overlined')) {
                    ef = event.target.style.textDecorationLine.concat(' ', `overline`);
                    event.target.style.textDecorationLine = ef;
                    note.style.textDecorationLine = ef;
                    preview.style.textDecorationLine = ef;
                }
                if(param.includes('Small caps')) {
                    event.target.style.fontVariant = `small-caps`;
                    note.style.fontVariant = `small-caps`;
                    preview.style.fontVariant = `small-caps`;
                }
                if(param.includes('All caps')) {
                    event.target.style.textTransform = `uppercase`;
                    note.style.textTransform = `uppercase`;
                    preview.style.textTransform = `uppercase`;
                }
            }
        }else {
            if(param==='font') {
                event.target.style.fontFamily = `${previousFont}`;
                note.style.fontFamily = `${previousFont}`;
            }
            else if(param==='size') {
                note.style.fontSize = `${previousSize}px`;
            }
            else if(param==='style') {
                //style
                event.target.style.fontStyle = `${previousStyle.style}`;
                note.style.fontStyle = `${previousStyle.style}`;
                //weight
                event.target.style.fontWeight = `${previousStyle.weight}`;
                note.style.fontWeight = `${previousStyle.weight}`;
            }
            else{
                if(param.includes('Strikethrough')) {
                    ef = event.target.style.textDecorationLine.replace("line-through", "");
                    event.target.style.textDecorationLine = ef;
                    note.style.textDecorationLine = ef;
                    preview.style.textDecorationLine = ef;
                }
                if(param.includes('Superscript')) {

                    event.target.style.verticalAlign = `unset`;
                    note.style.verticalAlign = `unset`;
                    preview.style.verticalAlign = `unset`;

                    note.style.fontSize = fontSizeRange.value+'px';
                    preview.style.fontSize = fontSizeRange.value+'px';
                    fontSizeRange.disabled=false;

                    note.style.lineHeight = paragraphOptions.querySelector('#lineHeight').value;
                    preview.style.lineHeight = paragraphOptions.querySelector('#lineHeight').value;
                    paragraphOptions.querySelector('#lineHeight').disabled = false;
                    
                }
                if(param.includes('Underlined')) {
                    ef = event.target.style.textDecorationLine.replace("underline", "");
                    event.target.style.textDecorationLine = ef;
                    note.style.textDecorationLine = ef;
                    preview.style.textDecorationLine = ef;
                    
                }
                if(param.includes('Overlined')) {
                    ef = event.target.style.textDecorationLine.replace("overline", "");
                    event.target.style.textDecorationLine = ef;
                    note.style.textDecorationLine = ef;
                    preview.style.textDecorationLine = ef;
                }
                if(param.includes('Small caps')) {
                    event.target.style.fontVariant = `normal`;
                    note.style.fontVariant = `normal`;
                    preview.style.fontVariant = `normal`;
                }
                if(param.includes('All caps')) {
                    event.target.style.textTransform = `unset`;
                    note.style.textTransform = `unset`;
                    preview.style.textTransform = `unset`;
                }
            }
        }
    }
    window.onclick = function(e) {
        if (e.target == modal) {
            updateFont('all', false, e.target);
            closeFontModal(modal);
        }
    }


}
function closeFontModal(modal) {
    colorModalOpen = false;
    modal.remove();

}
// var change = false;
// function checkSnap(event) {
//     // if I just enabled snapping
//     if(isSnappingEnabled) {
//         // interactElements.length = 0; // Clear existing targets  
//         interactableElements.forEach(element => {
//             const rect = element.getBoundingClientRect();
//             return {
//                 interactElements.push({ x: (parseFloat(element.getAttribute('data-x')) || rect.left), element, range:20 });
//                 interactElements.push({ x: ((parseFloat(element.getAttribute('data-x'))+(scale*rect.width)) || rect.right), element, range:20 });
//                 interactElements.push({ y: (parseFloat(element.getAttribute('data-y')) || rect.top), element, range:20 });
//                 interactElements.push({ y: ((parseFloat(element.getAttribute('data-y'))+(scale*rect.height)) || rect.bottom), element, range:20 });
//             };
//         });
        
//     }
// }
function updateSnap(event) {
    console.log('update')
}


//VIDEO PROGRESS BAR: WIDTH TO TIME
// const scrub = e => {

//     // video.currentTime = video.duration / (e.target.style.flexBasis/100);
//     const scrubTime = (e.offsetX / progress.offsetWidth) * video.duration;
//     video.currentTime = scrubTime;
//   }
