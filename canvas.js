let alphaImage = new Image()
alphaImage.src = "./././images/four_leaf_clover.png" 
let canvas = null
let ctx = null
let selectedImage
let selectedText
let isDragging = false
let drawingSelected = false
let offsetX = 0
let offsetY = 0
let drawRadius = 5
let drawColour = "red"
let isDrawing = false
let drawingPoints = []
let redoDrawingPoints = []
let displayCancel = false
let textList = []
let noConvolutionMatrix = [0, 0, 0, 0, 1, 0, 0, 0, 0]
let itemIndex = 0
let displayList = []
let selectedImageInImages = -1

let images = []
images.forEach((image) => {
  image.img.src = image.filename
  image.index = itemIndex
  itemIndex++
})
let fonts = [
  "Arial",
  "Times New Roman",
  "Courier New",
  "Georgia",
  "Garamond",
  "Brush Script MT",
  "Comic Sans MS",
  "Impact",
  "Lucida Sans",
  "Tahoma",
  "Trebuchet MS",
  "Arial Black",
]

let embossConvolutionMatrix = [0, 0, 0, 0, 2, -1, 0, -1, 0]

let blurConvolutionMatrix = [1, 2, 1, 2, 4, 2, 1, 2, 1]

let sharpenConvolutionMatrix = [0, -2, 0, -2, 11, -2, 0, -2, 0]

let edgeDetectionConvolutionMatrix = [1, 1, 1, 1, -7, 1, 1, 1, 1]

let mouseX = 0
let mouseY = 0
window.onload = onAllAssetsLoaded
document.write("<div id='loadingMessage'>Loading...</div>")

function onAllAssetsLoaded() {
  setFonts()
  document.getElementById("canvas").style.backgroundColor = "#fff"

  document.getElementById("filters").style.display = "none"
  document.getElementById("drawControls").style.display = "none"
  document.getElementById("textBoxControls").style.display = "none"
  document.getElementById("dragControls").style.display = "none"
  document.getElementById("imageSettingControls").style.display = "none"

  document.getElementById("loadingMessage").style.visibility = "hidden"
  canvas = document.getElementById("canvas")
  ctx = canvas.getContext("2d")

  canvas.width = canvas.clientWidth
  canvas.height = canvas.clientHeight

  setControlsForSelectedImage()
  canvas.addEventListener("click", clickHandler)
  canvas.addEventListener("mousedown", mousedownHandler)
  canvas.addEventListener("mousemove", moveHandler)

  canvas.addEventListener("mouseup", stopDrag)
  canvas.addEventListener("mouseup", finishLine)
  canvas.addEventListener("wheel", mousewheelHandler)
  canvas.addEventListener("mouseleave", stopDrag)

  renderCanvas()
}

function renderCanvas() {
  displayCancel = false
  if (!drag.checked) isDragging = false
  updateUndoRedoStates()
  document.getElementById("confirmation").innerHTML = ""

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  let backgroundImg = new Image()
  backgroundImg.src = "./././images/white.png"
  ctx.drawImage(backgroundImg, 0, 0, canvas.width, canvas.height)

  displayList = [...images, ...textList, ...drawingPoints]
  displayList.sort((a, b) => a.index - b.index)

  displayList.forEach((item, index) => {
    ctx.save()
    if (item.img) {
      ctx.globalCompositeOperation = item.blendMode

      let offScreenCanvas = document.createElement("canvas")
      offScreenCanvas.width = item.w
      offScreenCanvas.height = item.h
      let offScreenCtx = offScreenCanvas.getContext("2d")

      offScreenCtx.drawImage(item.img, 0, 0, item.w, item.h)

      let imageData = offScreenCtx.getImageData(0, 0, item.w, item.h)
      let data = imageData.data

      let brightnessRed = item.brightness + item.red
      let brightnessGreen = item.brightness + item.green
      let brightnessBlue = item.brightness + item.blue

      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, Math.max(0, data[i] + brightnessRed))
        data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + brightnessGreen))
        data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + brightnessBlue))
      }

      if (item.grayscale) applyGrayscale(data)
      if (item.threshold) applyThreshold(data)
      if (item.sepia) applySepia(data)
      if (item.invert) applyInvert(data)
      if (item.posterise) applyPosterise(data)

      if (
        item.convolutionMatrix &&
        item.convolutionMatrix !== noConvolutionMatrix
      ) {
        imageData = applyConvolution(imageData, item.convolutionMatrix)
      }

      offScreenCtx.putImageData(imageData, 0, 0)

      ctx.translate(item.x + item.w / 2, item.y + item.h / 2)
      ctx.rotate(Math.radians(item.rotate))

      if (index === selectedImage) {
        ctx.strokeStyle = "red"
        ctx.lineWidth = 2
        ctx.strokeRect(
          -item.w / 2 - 2,
          -item.h / 2 - 2,
          item.w + 4,
          item.h + 4
        )
      }

      ctx.drawImage(offScreenCanvas, -item.w / 2, -item.h / 2)

      if (selectedImage === index) {
        updateFilterPreviews(item)
      }
    } else if (item.text) {
      ctx.translate(item.x, item.y)

      if (index === selectedText) {
        ctx.rotate((document.getElementById("rotate").value * Math.PI) / 180)
      } else {
        ctx.rotate((item.textRotate * Math.PI) / 180)
      }

      if (index === selectedText) {
        ctx.save()
        ctx.fillStyle = "red"
        ctx.font = item.fontSize + item.fontStyle
        ctx.fillText(item.text, 1.5, 1.5)
        ctx.restore()
      }

      ctx.fillStyle = item.color
      ctx.font = item.fontSize + item.fontStyle
      ctx.fillText(item.text, 0, 0)
    } else if (item.radius) {
      if (drawingSelected && !item.eraser) {
        ctx.fillStyle = "red"
        ctx.beginPath()
        ctx.arc(item.x, item.y, item.radius, 0, Math.PI * 2)
        ctx.fill()
        ctx.closePath()
      } else if (drawingSelected && item.eraser) {
        ctx.fillStyle = "white"
        ctx.beginPath()
        ctx.arc(item.x, item.y, item.radius, 0, Math.PI * 2)
        ctx.fill()
        ctx.closePath()
      } else if (!drawingSelected) {
        ctx.fillStyle = item.color
        ctx.beginPath()
        ctx.arc(item.x, item.y, item.radius, 0, Math.PI * 2)
        ctx.fill()
        ctx.closePath()
      }
    }

    ctx.restore()
  })

  let eraser = document.getElementById("eraserCheckbox")
  let size = document.getElementById("size")
  let draw = document.getElementById("draw")
  drawCursorPreview()
}
function applyBlendMode() {
  if (selectedImage >= 0) {
    let blendSelect = document.getElementById("blendModeSelect")
    displayList[selectedImage].blendMode = blendSelect.value

    renderCanvas()
  }
}

function createTextMask() {
  if (selectedImage >= 0) {
    let text = document.getElementById("textbox").value
    let fontSize = parseInt(document.getElementById("textSize").value)
    let fontFamily = document.getElementById("selectedFont").value

    let maskCanvas = document.createElement("canvas")
    maskCanvas.width = displayList[selectedImage].w
    maskCanvas.height = displayList[selectedImage].h
    let maskCtx = maskCanvas.getContext("2d")

    maskCtx.fillStyle = "black"
    maskCtx.font = `${fontSize}px ${fontFamily}`
    maskCtx.textAlign = "center"
    maskCtx.textBaseline = "middle"
    maskCtx.fillText(text, maskCanvas.width / 2, maskCanvas.height / 2)

    let imageCanvas = document.createElement("canvas")
    imageCanvas.width = displayList[selectedImage].w
    imageCanvas.height = displayList[selectedImage].h
    let imageCtx = imageCanvas.getContext("2d")

    imageCtx.drawImage(
      displayList[selectedImage].img,
      0,
      0,
      displayList[selectedImage].w,
      displayList[selectedImage].h
    )

    imageCtx.globalCompositeOperation = "destination-in"
    imageCtx.drawImage(maskCanvas, 0, 0)

    displayList[selectedImage].img = imageCanvas

    renderCanvas()
  }
}

function applyImageMask() {
  //reference https://www.w3docs.com/learn-javascript/file-and-filereader.html

  if (selectedImage >= 0) {
    let fileInput = document.createElement("input")
    fileInput.type = "file"
    fileInput.accept = "image/*"

    fileInput.onchange = (e) => {
      if (e.target.files.length > 0) {
        let selectedFile = e.target.files[0]
        let reader = new FileReader()

        reader.onload = function (e) {
          let maskImg = new Image()
          maskImg.onload = function () {
            let doubleBuffer = document.createElement("canvas")
            doubleBuffer.width = displayList[selectedImage].w
            doubleBuffer.height = displayList[selectedImage].h
            let doubleBufferCtx = doubleBuffer.getContext("2d")

            doubleBufferCtx.drawImage(
              maskImg,
              0,
              0,
              doubleBuffer.width,
              doubleBuffer.height
            )

            doubleBufferCtx.globalCompositeOperation = "source-in"

            doubleBufferCtx.drawImage(
              displayList[selectedImage].img,
              0,
              0,
              doubleBuffer.width,
              doubleBuffer.height
            )

            displayList[selectedImage].img = doubleBuffer
            renderCanvas()
          }
          maskImg.src = e.target.result
        }
        reader.readAsDataURL(selectedFile)
      }
    }
    fileInput.click()
  }
}
function deleteSelectedImage() {
  if (selectedImage >= 0) {
    images.splice(selectedImage, 1)
    selectedImage = -1
    renderCanvas()
  }
}
function updateUndoRedoStates() {
  if (drawingPoints.length === 0) {
    document.getElementById("undoLabel").style.backgroundColor = "#cecece61"
    document.getElementById("undoLabel").style.cursor = "default"
  } else {
    document.getElementById("undoLabel").style.backgroundColor = ""
    document.getElementById("undoLabel").style.cursor = "pointer"
  }

  if (redoDrawingPoints.length === 0) {
    document.getElementById("redoLabel").style.backgroundColor = "#cecece61"
    document.getElementById("redoLabel").style.cursor = "default"
  } else {
    document.getElementById("redoLabel").style.backgroundColor = ""
    document.getElementById("redoLabel").style.cursor = "pointer"
  }
}
function updateFilterPreviews(image) {
  if (selectedImage >= 0) {
    let width = 100
    let height = 100

    document.getElementById("filter1").src = image.filename
    let sampleBrightness = translateBrightnessToCss(image.brightness)
    document.getElementById(
      "filter1"
    ).style.filter = `brightness(${sampleBrightness}%) grayscale(100%)`

    document.getElementById("filter1").style.width = width + "px"
    document.getElementById("filter1").style.height = height + "px"

    document.getElementById(
      "filter2"
    ).style.filter = `brightness(${sampleBrightness}%) grayscale(2000%) contrast(2000%)`
    document.getElementById("filter2").style.width = width + "px"
    document.getElementById("filter2").style.height = height + "px"

    document.getElementById(
      "filter3"
    ).style.filter = `brightness(${sampleBrightness}%) sepia(100%)`

    document.getElementById("filter3").style.width = width + "px"
    document.getElementById("filter3").style.height = height + "px"
    document.getElementById(
      "filter4"
    ).style.filter = `brightness(${sampleBrightness}%) invert(100%)`
    document.getElementById("filter4").style.width = width + "px"
    document.getElementById("filter4").style.height = height + "px"
    document.getElementById(
      "filter5"
    ).style.filter = `brightness(${sampleBrightness}%) contrast(3)`
    document.getElementById("filter5").style.width = width + "px"
    document.getElementById("filter5").style.height = height + "px"

    document.getElementById("filter2").src = image.filename
    document.getElementById("filter3").src = image.filename
    document.getElementById("filter4").src = image.filename
    document.getElementById("filter5").src = image.filename
  }
}

function drawCursorPreview() {
  if (mouseIsInsideImage(0, 0, canvas.w, canvas.h, mouseX, mouseY)) {
    let size = document.getElementById("size").value
    let draw = document.getElementById("draw")
    let eraser = document.getElementById("eraser")

    if (draw.checked && !displayCancel) {
      canvas.style.cursor = "none"
      ctx.beginPath()
      ctx.strokeStyle = "grey"
      ctx.arc(mouseX, mouseY, size, 0, Math.PI * 2)
      ctx.stroke()
      ctx.closePath()
      ctx.clearRect(mouseX, mouseY, size, 0, Math.PI * 2)
    }
  } else if (!drag.checked) {
    canvas.style.cursor = "default"
  }
}

function addImage() {
  //reference https://www.w3docs.com/learn-javascript/file-and-filereader.html
  let fileInput = document.getElementById("myfile")
  if (fileInput.files.length > 0) {
    let selectedFile = fileInput.files[0]
    let reader = new FileReader()

    reader.onload = function (e) {
      let img = new Image()
      img.onload = function () {
        images.push({
          x: canvas.width / 2 - img.width / 2,
          y: canvas.height / 2 - img.height / 2,
          w: img.width,
          h: img.height,
          img: img,
          filename: e.target.result,
          brightness: 0,
          red: 0,
          green: 0,
          blue: 0,
          rotate: 0,
          grayscale: false,
          threshold: false,
          sepia: false,
          invert: false,
          posterise: false,
          convolutionMatrix: noConvolutionMatrix,
          index: itemIndex++,
          filename: e.target.result,
        })

        selectedImage = images.length - 1
        selectedImageInImages = selectedImage
        renderCanvas()
      }
      img.src = e.target.result
    }

    reader.readAsDataURL(selectedFile)
  }
  renderCanvas()
}
function moveSelectedToFront() {
  if (selectedImage >= 0) {
    let maxIndex = displayList[displayList.length - 1].index + 1
    displayList[selectedImage].index = maxIndex + 1
    selectedImage = maxIndex + 1

    renderCanvas()
  } else if (selectedText >= 0) {
    let maxIndex = displayList[displayList.length - 1].index + 1

    displayList[selectedText].index = maxIndex + 1
    selectedText = maxIndex + 1
    renderCanvas()
  } else if (drawingSelected) {
    let maxIndex = displayList[displayList.length - 1].index + 1

    drawingPoints.forEach((point) => {
      point.index = maxIndex + 1
    })
    renderCanvas()
  }
}
function moveSelectedToBack() {
  if (selectedImage >= 0) {
    displayList.forEach(
      (displayItem) => (displayItem.index = displayItem.index + 1)
    )

    displayList[selectedImage].index = 0
    selectedImage = 0
    renderCanvas()
  } else if (selectedText >= 0) {
    displayList.forEach(
      (displayItem) => (displayItem.index = displayItem.index + 1)
    )

    displayList[selectedText].index = 0
    renderCanvas()
  } else if (drawingSelected) {
    let maxIndex = displayList[displayList.length - 1].index + 1
    displayList.forEach(
      (displayItem) => (displayItem.index = displayItem.index + 1)
    )
    drawingPoints.forEach((point) => {
      point.index = 0
    })
    renderCanvas()
  }
}

function translateBrightnessToCss(x) {
  if (x >= 0) {
    return 100 + (x / 255) * 700
  } else {
    return 100 * (1 + x / 255)
  }
}
function applyGrayscale(data) {
  for (let i = 0; i < data.length; i += 4) {
    let gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
    data[i] = data[i + 1] = data[i + 2] = gray;
  }
}

function applyThreshold(data) {
  for (let i = 0; i < data.length; i += 4) {
    let avg = (data[i] + data[i + 1] + data[i + 2]) / 3
    let val = avg < 128 ? 0 : 255
    data[i] = data[i + 1] = data[i + 2] = val
  }
}

function applySepia(data) {
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i],
      g = data[i + 1],
      b = data[i + 2]
    data[i] = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189)
    data[i + 1] = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168)
    data[i + 2] = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131)
  }
}

function applyInvert(data) {
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 255 - data[i]
    data[i + 1] = 255 - data[i + 1]
    data[i + 2] = 255 - data[i + 2]
  }
}

function applyPosterise(data) {
  for (let i = 0; i < data.length; i += 4) {
    data[i] = data[i] - (data[i] % 64)
    data[i + 1] = data[i + 1] - (data[i + 1] % 64)
    data[i + 2] = data[i + 2] - (data[i + 2] % 64)
  }
}

function mousedownHandler(e) {
  if (e.which === 1) {
    selectedText = -1
    selectedImage = -1
    drawingSelected = false
    let rect = canvas.getBoundingClientRect()
    let mouseX = e.clientX - rect.left
    let mouseY = e.clientY - rect.top

    if (
      filter.checked ||
      drag.checked ||
      imageSetting.checked ||
      document.getElementById("textbox").value.length === 0
    ) {
      for (let i = displayList.length - 1; i >= 0; i--) {
        if (displayList[i].img) {
          let img = displayList[i]
          if (
            mouseX >= img.x &&
            mouseX <= img.x + img.w &&
            mouseY >= img.y &&
            mouseY <= img.y + img.h
          ) {
            selectedText = -1
            selectedImage = i
            isDragging = true
            drawingSelected = false

            offsetX = mouseX - img.x
            offsetY = mouseY - img.y
            setControlsForSelectedImage()
            break
          }
        }
      }
      for (let i = images.length - 1; i >= 0; i--) {
        let img = images[i]
        if (
          mouseX >= img.x &&
          mouseX <= img.x + img.w &&
          mouseY >= img.y &&
          mouseY <= img.y + img.h
        ) {
          selectedImageInImages = i
          break
        }
      }
    }
    let textEraser = document.getElementById("eraserTextCheckbox")

    if (textEraser.checked && text.checked) {
      for (let i = displayList.length - 1; i >= 0; i--) {
        let text = displayList[i]
        let textInfo = ctx.measureText(text)

        height =
          textInfo.actualBoundingBoxAscent +
          textInfo.actualBoundingBoxDescent * 10

        renderCanvas()
        if (
          mouseX >= text.x &&
          mouseX <= text.x + textInfo.actualBoundingBoxRight * 1.5 &&
          mouseY <= text.y &&
          mouseY >= text.y - height
        ) {
          redoTextList.push(text)
          textList.push({
            x: 0,
            y: 0,
            text: "",
            fontSize: "0",
            color: "red",
            textRotate: 0,
            index: itemIndex,
          })
          itemIndex++
          text.x = text.x - 100000
          break
        }
      }
    } else if (drag.checked) {
      for (let i = displayList.length - 1; i >= 0; i--) {
        if (displayList[i].text !== undefined) {
          let text = displayList[i]
          let textInfo = ctx.measureText(text)

          height =
            textInfo.actualBoundingBoxAscent +
            textInfo.actualBoundingBoxDescent * 10

          if (
            mouseX >= text.x &&
            mouseX <= text.x + textInfo.actualBoundingBoxRight * 1.5 &&
            mouseY <= text.y &&
            mouseY >= text.y - height
          ) {
            selectedImage = -1

            selectedText = i
            isDragging = true
            drawingSelected = false

            offsetX = mouseX - text.x
            offsetY = mouseY - text.y
            setControlsForSelectedText()
            break
          }
        } else if (displayList[i].radius) {
          let point = displayList[i]
          if (
            ((mouseX <= point.x && mouseX >= point.x - point.radius) ||
              (mouseX >= point.x && mouseX <= point.x + point.radius)) &&
            ((mouseY <= point.y && mouseY >= point.y - point.radius) ||
              (mouseY >= point.y && mouseY <= point.y + point.radius)) &&
            mouseX <= point.x + point.radius / 2 &&
            !point.eraser === true
          ) {
            drawingSelected = true
            selectedText = -1
            selectedImage = -1
            break
          }
        }
      }
    }
  }
}

function moveHandler(e) {
  let rect = canvas.getBoundingClientRect()

  mouseX = e.clientX - rect.left
  mouseY = e.clientY - rect.top
  let size = document.getElementById("size").value
  if (!displayCancel) renderCanvas()
  else {
    canvas.style.cursor = "default"
  }

  if (e.buttons == 1) {
    let rect = canvas.getBoundingClientRect()
    let mouseX = e.clientX - rect.left
    let mouseY = e.clientY - rect.top
    let eraser = document.getElementById("eraserCheckbox")

    if (draw.checked && !eraser.checked) {
      drawingPoints.push({
        x: mouseX,
        y: mouseY,
        radius: drawRadius,
        color: drawColour,
        index: itemIndex,
        eraser: false,
      })
      itemIndex++
    } else if (isDragging) {
      if (textList.length > 0 && selectedText >= 0) {
        displayList[selectedText].x = mouseX - offsetX
        displayList[selectedText].y = mouseY - offsetY
      }

      if (selectedImage >= 0) {
        displayList[selectedImage].x = mouseX - offsetX
        displayList[selectedImage].y = mouseY - offsetY
      }
    } else if (eraser.checked && draw.checked) {
      // drawingPoints.push({
      //   x: mouseX,
      //   y: mouseY,
      //   radius: drawRadius,
      //   color: document.getElementById("canvas").style.backgroundColor,
      //   index: itemIndex,
      //   eraser: true,
      // })
      // itemIndex++

        for (let i = displayList.length - 1; i >= 0; i--) {
          if (displayList[i].radius) {
            let point = displayList[i]
            if (
              ((mouseX <= point.x && mouseX >= point.x - point.radius) ||
                (mouseX >= point.x && mouseX <= point.x + point.radius)) &&
              ((mouseY <= point.y && mouseY >= point.y - point.radius) ||
                (mouseY >= point.y && mouseY <= point.y + point.radius)) &&
              mouseX <= point.x + point.radius / 2
            ) {
              redoDrawingPoints.push(point)
              point.x -= 10000
              break
            }
          }
        }
    }

    renderCanvas()
  }
}

function mousewheelHandler(e) {
  if (drag.checked) {
    let canvasBoundingRectangle = canvas.getBoundingClientRect()
    let mouseX = e.clientX - canvasBoundingRectangle.left
    let mouseY = e.clientY - canvasBoundingRectangle.top

    image = displayList[selectedImage]
    let text = displayList[selectedText]
    if (selectedImage >= 0) {
      if (
        mouseIsInsideImage(image.x, image.y, image.w, image.h, mouseX, mouseY)
      ) {
        if (widthCheckbox.checked) image.w += e.wheelDelta / 60
        if (heightCheckbox.checked) image.h += e.wheelDelta / 60

        renderCanvas()
      }
    } else if (selectedText >= 0) {
      let textInfo = ctx.measureText(text)
      height =
        textInfo.actualBoundingBoxAscent +
        textInfo.actualBoundingBoxDescent * 10
      if (
        mouseX >= text.x &&
        mouseX <= text.x + textInfo.actualBoundingBoxRight * 1.5 &&
        mouseY <= text.y &&
        mouseY >= text.y - height
      ) {
        console.log(e.wheelDelta)
        if (widthCheckbox.checked || heightCheckbox.checked) {
          widthCheckbox.checked = true
          heightCheckbox.checked = true
          updateOptions()
          if (e.wheelDelta > 0) text.fontSize += 1
          else if (e.wheelDelta < 0) text.fontSize += -1
        }

        renderCanvas()
      }
    }
  }
}

function mouseIsInsideImage(
  imageTopLeftX,
  imageTopLeftY,
  imageWidth,
  imageHeight,
  x,
  y
) {
  if (x > imageTopLeftX && y > imageTopLeftY) {
    if (x > imageTopLeftX) {
      if (x - imageTopLeftX > imageWidth) {
        return false
      }
    }

    if (y > imageTopLeftY) {
      if (y - imageTopLeftY > imageHeight) {
        return false
      }
    }
  } else {
    return false
  }
  return true
}

function stopDrag() {
  isDragging = false
}

function finishLine() {
  if (draw.checked) {
    drawingPoints.push({
      x: 0,
      y: 0,
      radius: 0,
      color: "red",
      index: itemIndex,
      eraser: false,
    })
    itemIndex++
  }
}

function finishText() {
  if (text.checked && !document.getElementById("textEraser")) {
    textList.push({
      x: 0,
      y: 0,
      text: "",
      fontSize: "0",
      color: "red",
      textRotate: 0,
      index: itemIndex,
    })
    itemIndex++
  }
}

function clickHandler(e) {
  if (document.getElementById("text").checked) {
    let rect = canvas.getBoundingClientRect()
    let mouseX = e.clientX - rect.left
    let mouseY = e.clientY - rect.top
    let textEraser = document.getElementById("eraserTextCheckbox")
    if (!textEraser.checked) {
      textList.push({
        x: mouseX,
        y: mouseY,
        text: document.getElementById("textbox").value,
        fontSize: parseInt(document.getElementById("textSize").value),
        fontStyle: "px " + document.getElementById("selectedFont").value,
        color: document.getElementById("textColour").value,
        textRotate: 0,
        index: itemIndex,
      })
      itemIndex++
    }
    finishText()
  }
  if (selectedImage >= 0) setControlsForSelectedImage()

  renderCanvas()
}
Math.radians = function (degrees) {
  return (degrees * Math.PI) / 180
}

function undoDraw() {
  if (drawingPoints.length === 0) return

  let lastIndex = drawingPoints[drawingPoints.length - 1]

  while (drawingPoints.length > 0) {
    let lastPoint = drawingPoints.pop()
    redoDrawingPoints.push(lastPoint)
    if (lastPoint.radius === 0) {
      break
    }
  }

  renderCanvas()
}
function redoDraw() {
  if (redoDrawingPoints.length === 0) {
    return
  }

  while (redoDrawingPoints.length > 0) {
    lastPoint = redoDrawingPoints.pop()
    if (lastPoint.x < 0) lastPoint.x += 10000

    drawingPoints.push(lastPoint)
    if (lastPoint.radius === 0) {
      break
    }
  }

  renderCanvas()
}

function undoText() {
  if (textList.length === 0) return

  let lastIndex = textList[textList.length - 1]
  if (lastIndex.x === 0) {
    textList.pop()
  }

  while (textList.length > 0) {
    let lastPoint = textList.pop()
    redoTextList.push(lastPoint)

    if (lastPoint.x === 0) {
      break
    }
  }

  renderCanvas()
}

let redoTextList = []

function redoText() {
  if (redoTextList.length === 0) {
    return
  }

  while (redoTextList.length > 0) {
    lastPoint = redoTextList.pop()
    if (lastPoint.x < 0) lastPoint.x += 100000

    textList.push(lastPoint)
    if (lastPoint.x === 0) {
      break
    }
  }

  renderCanvas()
}

function displayClearDraw() {
  displayCancel = true
  let htmlString = `
      <div id="deleteContainer">
      <div id="delete" class="modal">
          <h3>Confirm Clear</h3>
          <p>Are you sure you want to clear all drawings</p>
            <button id="confirm" onclick="clearDraw()">Delete</button>
            <br><button id="confirm" onclick="renderCanvas()">Cancel</button>
      </div>
      </div>`
  document.getElementById("confirmation").innerHTML = htmlString
}
function displayImageDelete() {
  if (selectedImage >= 0) {
    displayCancel = true
    let htmlString = `
      <div id="deleteContainer">
      <div id="delete" class="modal">
          <h3>Confirm Delete</h3>
          <p>Are you sure you want to delete the selected image</p>
            <button id="confirm" onclick="deleteImage()">Delete</button>
            <br><button id="confirm" onclick="renderCanvas()">Cancel</button>
      </div>
      </div>`
    document.getElementById("confirmation").innerHTML = htmlString
  }
}

function deleteImage() {
  document.getElementById("confirmation").innerHTML = ""

  if (selectedImage >= 0) {
    console.log(images)
    console.log(selectedImage)
    images.splice(selectedImageInImages, 1)

    selectedImage = -1

    setControlsForSelectedImage()

    renderCanvas()
  }
}

function clearDraw() {
  document.getElementById("confirmation").innerHTML = ""
  redoDrawingPoints = []

  while (drawingPoints.length > 0) {
    lastPoint = drawingPoints.pop()

    if (lastPoint.radius > 0) redoDrawingPoints.push(lastPoint)
  }
  renderCanvas()
}

function setControlsForSelectedImage() {
  if (selectedImage >= 0) {
    let img = displayList[selectedImage]

    document.getElementById("threshold").checked = img.threshold
    document.getElementById("posterise").checked = img.posterise
    document.getElementById("sepia").checked = img.sepia
    document.getElementById("invert").checked = img.invert
    document.getElementById("grayscale").checked = img.grayscale
    document.getElementById("rotate").value = img.rotate
    document.getElementById("brightness").value = img.brightness
    document.getElementById("brightnessRed").value = img.red
    document.getElementById("brightnessGreen").value = img.green
    document.getElementById("brightnessBlue").value = img.blue

    if (img.threshold) {
      document.getElementById("threshold").parentNode.style.backgroundColor =
        "#cecece61"
    } else {
      document.getElementById("threshold").parentNode.style.backgroundColor =
        ""
    }

    if (img.posterise) {
      document.getElementById("posterise").parentNode.style.backgroundColor =
        "#cecece61"
    } else {
      document.getElementById("posterise").parentNode.style.backgroundColor =
        ""
    }

    if (img.sepia) {
      document.getElementById("sepia").parentNode.style.backgroundColor =
        "#cecece61"
    } else {
      document.getElementById("sepia").parentNode.style.backgroundColor = ""
    }

    if (img.invert) {
      document.getElementById("invert").parentNode.style.backgroundColor =
        "#cecece61"
    } else {
      document.getElementById("invert").parentNode.style.backgroundColor = ""
    }

    if (img.grayscale) {
      document.getElementById("grayscale").parentNode.style.backgroundColor =
        "#cecece61"
    } else {
      document.getElementById("grayscale").parentNode.style.backgroundColor =
        ""
    }
  }
}

function setControlsForSelectedText() {
  if (selectedText >= 0) {
    let text = displayList[selectedText]

    document.getElementById("rotate").value = text.textRotate
  }
}

function updateGrayscale() {
  let grayscale = document.getElementById("grayscale")
  displayList[selectedImage].grayscale = grayscale.checked

  if (grayscale.checked) {
    grayscale.parentNode.style.backgroundColor = "#cecece61"
  } else {
    grayscale.parentNode.style.backgroundColor = ""
  }
  renderCanvas()
}

function updateThreshold() {
  let threshold = document.getElementById("threshold")
  displayList[selectedImage].threshold = threshold.checked

  if (threshold.checked) {
    threshold.parentNode.style.backgroundColor = "#cecece61"
  } else {
    threshold.parentNode.style.backgroundColor = ""
  }
  renderCanvas()
}

function updateSepia() {
  let sepia = document.getElementById("sepia")
  displayList[selectedImage].sepia = sepia.checked

  if (sepia.checked) {
    sepia.parentNode.style.backgroundColor = "#cecece61"
  } else if (!sepia.checked && displayList[selectedImage].sepia == false) {
    sepia.parentNode.style.backgroundColor = ""
  }
  renderCanvas()
}

function updateInvert() {
  let invert = document.getElementById("invert")
  displayList[selectedImage].invert = invert.checked

  if (invert.checked) {
    invert.parentNode.style.backgroundColor = "#cecece61"
  } else {
    invert.parentNode.style.backgroundColor = ""
  }
  renderCanvas()
}

function updatePosterise() {
  let posterise = document.getElementById("posterise")
  displayList[selectedImage].posterise = posterise.checked

  if (posterise.checked) {
    posterise.parentNode.style.backgroundColor = "#cecece61"
  } else {
    posterise.parentNode.style.backgroundColor = ""
  }
  renderCanvas()
}

function updateRotate() {
  if (selectedImage >= 0) {
    displayList[selectedImage].rotate = parseInt(
      document.getElementById("rotate").value
    )
  }
  if (selectedText >= 0) {
    displayList[selectedText].textRotate = parseInt(
      document.getElementById("rotate").value
    )
  }
  renderCanvas()
}
function updateBrightnessLevel() {
  if (selectedImage >= 0) {
    displayList[selectedImage].brightness = parseInt(
      document.getElementById("brightness").value
    )

    displayList[selectedImage].red = parseInt(
      document.getElementById("brightnessRed").value
    )
    displayList[selectedImage].green = parseInt(
      document.getElementById("brightnessGreen").value
    )
    displayList[selectedImage].blue = parseInt(
      document.getElementById("brightnessBlue").value
    )

    renderCanvas()
  }
}

function resetBrightness() {
  document.getElementById("brightness").value = 0
  document.getElementById("brightnessRed").value = 0
  document.getElementById("brightnessGreen").value = 0
  document.getElementById("brightnessBlue").value = 0

  displayList[selectedImage].brightness = 0
  displayList[selectedImage].red = 0
  displayList[selectedImage].green = 0
  displayList[selectedImage].blue = 0
  setControlsForSelectedImage
  renderCanvas()
}
function updateConvolution() {
  let convolutionType = document.getElementById("convolutionType").value
  let matrix

  if (convolutionType === "emboss") {
    matrix = embossConvolutionMatrix
  } else if (convolutionType === "blur") {
    matrix = blurConvolutionMatrix
  } else if (convolutionType === "sharpen") {
    matrix = sharpenConvolutionMatrix
  } else if (convolutionType === "edge") {
    matrix = edgeDetectionConvolutionMatrix
  } else {
    matrix = noConvolutionMatrix
  }

  if (selectedImage >= 0) displayList[selectedImage].convolutionMatrix = matrix

  renderCanvas()
}

function applyConvolution(imageData, matrix) {
  let data = imageData.data
  let width = imageData.width
  let height = imageData.height

  let originalData = new Uint8ClampedArray(data)

  let totalConvolutionSum = 0
  for (let j = 0; j < 9; j++) {
    totalConvolutionSum += matrix[j]
  }

  for (let i = 0; i < data.length; i += 4) {
    data[i + 3] = 255

    for (let rgbOffset = 0; rgbOffset < 3; rgbOffset++) {
      let convolutionPixels = [
        originalData[i + rgbOffset - width * 4 - 4],
        originalData[i + rgbOffset - width * 4],
        originalData[i + rgbOffset - width * 4 + 4],
        originalData[i + rgbOffset - 4],
        originalData[i + rgbOffset],
        originalData[i + rgbOffset + 4],
        originalData[i + rgbOffset + width * 4 - 4],
        originalData[i + rgbOffset + width * 4],
        originalData[i + rgbOffset + width * 4 + 4],
      ]

      let convolvedPixel = 0
      for (let j = 0; j < 9; j++) {
        convolvedPixel += convolutionPixels[j] * matrix[j]
      }

      if (matrix === embossConvolutionMatrix) {
        data[i + rgbOffset] = convolvedPixel + 127
      } else {
        if (totalConvolutionSum > 0) {
          convolvedPixel /= totalConvolutionSum
        }
        data[i + rgbOffset] = convolvedPixel
      }
    }
  }

  return imageData
}
function updateOptions() {
  let draw = document.getElementById("draw")
  let eraser = document.getElementById("eraserCheckbox")
  let textEraser = document.getElementById("eraserTextCheckbox")
  let imageSetting = document.getElementById("imageSetting")
  let drag = document.getElementById("drag")
  let filter = document.getElementById("filter")
  let rotation = document.getElementById("rotation")
  drawRadius = document.getElementById("size").value
  drawColour = document.getElementById("colour").value
  document.getElementById("sizeValue").innerHTML =
    document.getElementById("size").value + "px"
  document.getElementById("textSizeValue").innerHTML =
    document.getElementById("textSize").value + "px"

  let widthCheckbox = document.getElementById("widthCheckbox")
  let heightCheckbox = document.getElementById("heightCheckbox")
  let sizeImage = document.getElementById("sizeImage")
  let size = document.getElementById("size").value
  sizeImage.style.width = `${size * 2}px`
  sizeImage.style.height = `${size * 2}px`

  if (draw.checked) {
    document.getElementById("brightnessControlsCheckbox").checked = false

    document.getElementById("drawLabel").style.backgroundColor = "#cecece61"
    document.getElementById("drawControls").style.display = "flex"
  } else {
    document.getElementById("drawLabel").style.backgroundColor = ""
    document.getElementById("drawControls").style.display = "none"
    canvas.style.cursor = "default"
  }

  if (widthCheckbox.checked) {
    document.getElementById("imageWidthLabel").style.backgroundColor =
      "#cecece61"
  } else {
    document.getElementById("imageWidthLabel").style.backgroundColor = ""
  }

  if (heightCheckbox.checked) {
    document.getElementById("imageHeightLabel").style.backgroundColor =
      "#cecece61"
  } else {
    document.getElementById("imageHeightLabel").style.backgroundColor = ""
  }

  if (eraser.checked) {
    document.getElementById("eraserLabel").style.backgroundColor = "#cecece61"
    drawColour = document.getElementById("canvas").style.backgroundColor
  } else {
    document.getElementById("eraserLabel").style.backgroundColor = ""
    drawColour = document.getElementById("colour").value
  }

  if (textEraser.checked) {
    document.getElementById("eraserTextLabel").style.backgroundColor =
      "#cecece61"
  } else {
    document.getElementById("eraserTextLabel").style.backgroundColor = ""
  }

  if (drag.checked) {
    document.getElementById("brightnessControlsCheckbox").checked = false

    document.getElementById("dragLabel").style.backgroundColor = "#cecece61"
    document.getElementById("dragControls").style.display = "flex"
    canvas.style.cursor = "move"
  } else {
    document.getElementById("dragLabel").style.backgroundColor = ""
    document.getElementById("dragControls").style.display = "none"
  }

  if (filter.checked) {
    document.getElementById("filterLabel").style.backgroundColor = "#cecece61"
    document.getElementById("filters").style.display = "flex"
  } else {
    document.getElementById("filterLabel").style.backgroundColor = ""
    document.getElementById("filters").style.display = "none"
  }

  if (imageSetting.checked) {
    document.getElementById("brightnessControlsCheckbox").checked = false

    document.getElementById("imageSettingLabel").style.backgroundColor =
      "#cecece61"
    document.getElementById("imageSettingControls").style.display = "flex"
  } else {
    document.getElementById("imageSettingLabel").style.backgroundColor = ""
    document.getElementById("imageSettingControls").style.display = "none"
  }
  if (document.getElementById("text").checked) {
    document.getElementById("brightnessControlsCheckbox").checked = false

    document.getElementById("textLabel").style.backgroundColor = "#cecece61"
    document.getElementById("textBoxControls").style.display = "flex"
  } else {
    document.getElementById("textLabel").style.backgroundColor = ""
    document.getElementById("textBoxControls").style.display = "none"
  }
  if (document.getElementById("brightnessControlsCheckbox").checked) {
    document.getElementById("filters").style.display = "flex"
    document.getElementById("mainFilters").style.display = "none"
    document.getElementById("brightnessControls").style.display = "flex"

    document.getElementById("brightnessControls").style.display = "flex"
    document.getElementById("brightnessControlsLabel").style.backgroundColor =
      "#cecece61"
  } else {
    document.getElementById("brightnessControls").style.display = "none"
    document.getElementById("mainFilters").style.display = "flex"

    document.getElementById("brightnessControlsLabel").style.backgroundColor =
      ""
  }
  renderCanvas()
}
function updateBrightnessCheckbox() {
  if (document.getElementById("brightnessControlsCheckbox").checked) {
    document.getElementById("brightnessControlsCheckbox").checked = false
  } else document.getElementById("brightnessControlsCheckbox").checked = true
  updateOptions()
}
function setFonts() {
  let fontOptions = ""
  fonts.forEach((font) => {
    fontOptions += `<option value="${font}" style="font-family: '${font}'">${font}</option>`
  })

  let htmlString = `<select id="selectedFont" onchange="updateOptions()">
            ${fontOptions}
        </select>`
  document.getElementById("fontOptions").innerHTML = htmlString
}
function updateRotation() {
  if (rotation.checked) {
    document.getElementById("rotateLabel").style.backgroundColor = "lightgray"
    document.getElementById("rotateControls").style.display = "flex"
  } else {
    document.getElementById("rotateLabel").style.backgroundColor = ""
    document.getElementById("rotateControls").style.display = "none"
    renderCanvas()
  }
}
