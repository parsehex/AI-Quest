<script setup>
import { socket } from "~/lib/socket";
import { ref, onBeforeUnmount } from "vue";

const isConnected = ref(false);
const transport = ref("");

if (socket.connected) {
  onConnect();
}

function onConnect() {
  isConnected.value = true;
  transport.value = socket.io.engine.transport.name;

  socket.io.engine.on("upgrade", (rawTransport) => {
    transport.value = rawTransport.name;
  });
}

function onDisconnect() {
  isConnected.value = false;
  transport.value = "";
}

socket.on("connect", onConnect);
socket.on("disconnect", onDisconnect);

onBeforeUnmount(() => {
  socket.off("connect", onConnect);
  socket.off("disconnect", onDisconnect);
});
</script>
<template>
  <div class="ml-2">
    <UTooltip class="relative" :text="transport">
      <span v-if="isConnected" class="inline-block w-3 h-3 bg-green-500 rounded-full"></span>
      <span v-else class="inline-block w-3 h-3 bg-red-500 rounded-full"></span>
    </UTooltip>
  </div>
</template>
