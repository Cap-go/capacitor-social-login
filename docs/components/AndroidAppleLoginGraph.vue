<script setup lang="ts">
import { Ref, ref, onMounted } from 'vue'
import { MarkerType, PanOnScrollMode, VueFlow, useVueFlow } from '@vue-flow/core'
import { useData } from 'vitepress';

const { isDark } = useData();
const finalElement = ref(null) as Ref<InstanceType<typeof VueFlow> | null>;
const { fitView } = useVueFlow();

// Define nodes with vertical arrangement
const nodes = ref([
    {
        id: 'A',
        type: 'input',
        position: { x: 250, y: 0 },
        data: { label: 'await SocialLogin.login()' },
    },
    {
        id: 'B',
        position: { x: 250, y: 150 },
        data: { label: 'Generate the login URL' },
    },
    {
        id: 'C',
        position: { x: 250, y: 300 },
        data: { label: 'Open the Chrome browser' },
    },
    {
        id: 'D',
        position: { x: 250, y: 450 },
        data: { label: 'Wait for the user to login' },
    },
    {
        id: 'E',
        position: { x: 250, y: 600 },
        data: { label: 'Handle the data returned from Apple' },
    },
    {
        id: 'F',
        position: { x: 250, y: 750 },
        data: { label: 'Redirect back to the app' },
    },
    {
        id: 'G',
        type: 'output',
        position: { x: 250, y: 900 },
        data: { label: 'Return to JS' },
    },
])

// Define edges connecting the nodes with custom styles
const edges = ref([
  {
    id: 'A-B',
    source: 'A',
    target: 'B',
    label: 'Handled in the plugin',
    markerEnd: MarkerType.ArrowClosed,
    style: { strokeWidth: 3 }
  },
  {
    id: 'B-C',
    source: 'B',
    target: 'C',
    label: 'Pass the link',
    markerEnd: MarkerType.ArrowClosed,
    style: { strokeWidth: 3 }
  },
  {
    id: 'C-D',
    source: 'C',
    target: 'D',
    markerEnd: MarkerType.ArrowClosed,
  },
  {
    id: 'D-E',
    source: 'D',
    target: 'E',
    label: 'Apple redirects to your backend',
    markerEnd: MarkerType.ArrowClosed,
  },
  {
    id: 'E-F',
    source: 'E',
    target: 'F',
    markerEnd: MarkerType.ArrowClosed,
  },
  {
    id: 'F-G',
    source: 'F',
    target: 'G',
    markerEnd: MarkerType.ArrowClosed,
  },
])

// Auto-center the graph whenever the component is mounted or window resized
onMounted(() => {
  // Use a small delay to ensure the component is fully rendered
  setTimeout(() => {
    if (finalElement.value) {
      fitView({ padding: 0, minZoom: 1, maxZoom: 1 });
    }
  }, 100);
  
  window.addEventListener('resize', () => {
    if (finalElement.value) {
      fitView({ padding: 0, minZoom: 1, maxZoom: 1 });
    }
  });
});
</script>

<template>
    <ClientOnly>
        <div :style="{ 
            width: '100%', 
            height: '1000px', 
            background: isDark ? '#313245' : '#f8fafc',
            '--vf-node-bg': isDark ? '#585b70' : '#f8fafc',
            '--vf-node-text': isDark ? '#cdd6f4' : '#334155'
        }">
            <VueFlow 
                ref="finalElement"
                :nodes="nodes" 
                :edges="edges" 
                :nodesDraggable="false"
                :paneMovable="false"
                :zoomOnScroll="false"
                :panOnScroll="false"
                :panOnScrollMode="PanOnScrollMode.Vertical"
                :zoomOnPinch="false"
                :zoomOnDoubleClick="false"
                :panOnDrag="false"
                :preventScrolling="false"
                :defaultViewport="{ x: 0, y: 0, zoom: 1 }"
                fitView
                :fitViewOptions="{ padding: 0, includeHiddenNodes: true, minZoom: 1, maxZoom: 1 }"
            />
        </div>
    </ClientOnly>
</template>

<style>
/* Import the necessary styles for Vue Flow */
@import '@vue-flow/core/dist/style.css';
@import '@vue-flow/core/dist/theme-default.css';

.vue-flow__edge-textbg {
    background-color: var(--vf-node-bg);
    color: var(--vf-node-text);
    fill: var(--vf-node-bg);
}

.vue-flow__edge-text {
    background-color: var(--vf-node-text);
    color: var(--vf-node-text);
    fill: var(--vf-node-text);
}
</style>