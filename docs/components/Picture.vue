<template>
  <div class="picture-container">
    <img
      :src="src"
      :alt="alt"
      @click="openOverlay"
      class="picture-image"
      :class="{ 'cursor-pointer': zoomable }"
    />

    <div
      v-if="showOverlay"
      class="overlay"
      @click="closeOverlay"
    >
      <div class="overlay-content" @wheel.prevent="handleZoom" @click.stop>
        <div class="zoom-controls">
          <button @click="zoomIn" class="zoom-button">+</button>
          <button @click="zoomOut" class="zoom-button">-</button>
          <button @click="closeOverlay" class="close-button">×</button>
        </div>
        <div class="zoom-container" 
          ref="zoomContainer" 
          @mousemove="handleMouseMove"
          @mousedown="startDrag"
          @mouseup="stopDrag"
          @mouseleave="stopDrag"
        >
          <img
            :src="src"
            :alt="alt"
            :style="imageStyle"
            class="overlay-image"
            ref="zoomImage"
            @dragstart.prevent
            draggable="false"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Picture',
  props: {
    src: {
      type: String,
      required: true
    },
    alt: {
      type: String,
      default: 'Image'
    },
    zoomable: {
      type: Boolean,
      default: true
    }
  },
  data() {
    return {
      showOverlay: false,
      zoomLevel: 1,
      minZoom: 1,
      maxZoom: 5,
      zoomStep: 0.5,
      wheelZoomStep: 0.1,
      posX: 0,
      posY: 0,
      dragStartX: 0,
      dragStartY: 0,
      isDragging: false
    }
  },
  computed: {
    imageStyle() {
      return {
        transform: `scale(${this.zoomLevel})`,
        transformOrigin: '0 0',
        position: 'absolute',
        top: `${this.posY}px`,
        left: `${this.posX}px`
      }
    }
  },
  methods: {
    openOverlay() {
      if (this.zoomable) {
        this.showOverlay = true
        document.body.style.overflow = 'hidden'
        this.$nextTick(() => {
          setTimeout(() => {
            this.resetZoom()
          }, 50)
        })
      }
    },
    closeOverlay() {
      this.showOverlay = false
      document.body.style.overflow = ''
    },
    zoomIn() {
      const zoomContainer = this.$refs.zoomContainer
      const centerX = zoomContainer.clientWidth / 2
      const centerY = zoomContainer.clientHeight / 2
      this.zoomAtPoint(centerX, centerY, this.zoomStep)
    },
    zoomOut() {
      if (this.zoomLevel <= this.minZoom + this.wheelZoomStep) {
        this.resetZoom()
        return
      }
      
      const zoomContainer = this.$refs.zoomContainer
      const centerX = zoomContainer.clientWidth / 2
      const centerY = zoomContainer.clientHeight / 2
      this.zoomAtPoint(centerX, centerY, -this.zoomStep)
    },
    resetZoom() {
      this.zoomLevel = 1
      this.posX = 0
      this.posY = 0
      
      const container = this.$refs.zoomContainer
      const image = this.$refs.zoomImage
      
      if (container && image) {
        this.centerImage(container, image)
        
        if (image.complete) {
          setTimeout(() => this.centerImage(container, image), 100)
        } else {
          image.onload = () => {
            this.centerImage(container, image)
            setTimeout(() => this.centerImage(container, image), 100)
          }
        }
      }
    },
    centerImage(container, image) {
      if (!container || !image) return
      
      const containerWidth = container.clientWidth
      const containerHeight = container.clientHeight
      
      const naturalWidth = image.naturalWidth || image.width || image.clientWidth
      const naturalHeight = image.naturalHeight || image.height || image.clientHeight
      
      if (!naturalWidth || !naturalHeight) {
        this.$nextTick(() => this.centerImage(container, image))
        return
      }
      
      const containerRatio = containerWidth / containerHeight
      const imageRatio = naturalWidth / naturalHeight
      
      let displayWidth, displayHeight
      
      if (imageRatio > containerRatio) {
        displayWidth = Math.min(naturalWidth, containerWidth)
        displayHeight = displayWidth / imageRatio
      } else {
        displayHeight = Math.min(naturalHeight, containerHeight)
        displayWidth = displayHeight * imageRatio
      }
      
      if (naturalWidth < containerWidth && naturalHeight < containerHeight) {
        displayWidth = naturalWidth
        displayHeight = naturalHeight
      }
      
      displayWidth = Math.floor(displayWidth)
      displayHeight = Math.floor(displayHeight)
      
      const leftPosition = Math.max(0, Math.floor((containerWidth - displayWidth) / 2))
      const topPosition = Math.max(0, Math.floor((containerHeight - displayHeight) / 2))
      
      this.posX = leftPosition
      this.posY = topPosition
      
      container.offsetHeight
    },
    handleZoom(e) {
      const rect = this.$refs.zoomContainer.getBoundingClientRect()
      const cursorX = e.clientX - rect.left
      const cursorY = e.clientY - rect.top
      
      const zoomChange = e.deltaY < 0 ? this.wheelZoomStep : -this.wheelZoomStep
      
      if (zoomChange < 0 && this.zoomLevel <= this.minZoom + this.wheelZoomStep) {
        this.resetZoom()
        return
      }
      
      this.zoomAtPoint(cursorX, cursorY, zoomChange)
    },
    zoomAtPoint(clientX, clientY, zoomChange) {
      const mouseX = (clientX - this.posX) / this.zoomLevel
      const mouseY = (clientY - this.posY) / this.zoomLevel
      
      const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoomLevel + zoomChange))
      
      if (newZoom !== this.zoomLevel) {
        this.zoomLevel = newZoom
        
        this.posX = clientX - (mouseX * this.zoomLevel)
        this.posY = clientY - (mouseY * this.zoomLevel)
      }
    },
    startDrag(e) {
      if (this.zoomLevel > 1) {
        e.preventDefault()
        this.isDragging = true
        this.dragStartX = e.clientX
        this.dragStartY = e.clientY
      }
    },
    stopDrag() {
      this.isDragging = false
    },
    handleMouseMove(e) {
      if (this.isDragging && this.zoomLevel > 1) {
        const deltaX = e.clientX - this.dragStartX
        const deltaY = e.clientY - this.dragStartY
        
        this.posX += deltaX
        this.posY += deltaY
        
        this.dragStartX = e.clientX
        this.dragStartY = e.clientY
      }
    }
  }
}
</script>

<style scoped>
.picture-container {
  position: relative;
  display: inline-block;
}

.picture-image {
  max-width: 100%;
  height: auto;
}

.cursor-pointer {
  cursor: pointer;
}

.overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.9);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  cursor: zoom-out;
}

.overlay-content {
  position: relative;
  width: 90%;
  height: 90%;
  display: flex;
  flex-direction: column;
}

.zoom-controls {
  display: flex;
  justify-content: flex-end;
  padding: 10px;
  background-color: rgba(0, 0, 0, 0.5);
  border-radius: 5px 5px 0 0;
}

.zoom-button, .close-button {
  background-color: rgba(255, 255, 255, 0.2);
  color: white;
  border: none;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  margin-left: 5px;
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-button {
  font-size: 24px;
}

.zoom-button:hover, .close-button:hover {
  background-color: rgba(255, 255, 255, 0.3);
}

.zoom-container {
  flex: 1;
  overflow: hidden;
  position: relative;
  cursor: grab;
}

.zoom-container:active {
  cursor: grabbing;
}

.overlay-image {
  max-height: 100%;
  max-width: 100%;
  object-fit: contain;
  user-select: none;
  -webkit-user-drag: none;
}
</style>
