<template>
	<div class="json-viewer-item" :style="{ marginLeft: `${depth * 5}px` }">
		<div v-if="isObject" @click="toggle" class="item-content">
			<span class="toggle-icon">{{ isExpanded ? '▼' : '▶' }}</span>
			<span class="key">{{ isArray ? `[${(data as any[]).length}]` : '{...}' }}</span>
		</div>
		<div v-if="isExpanded && isObject" class="nested-content">
			<template v-if="isArray">
				<div v-for="(item, index) in data" :key="index" class="array-item">
					<JsonViewerItem :data="item" :depth="depth + 1" />
				</div>
			</template>
			<template v-else>
				<div v-for="(value, key) in data" :key="key" class="object-item">
					<span class="key">{{ key }}:</span>
					<JsonViewerItem :data="value" :depth="depth + 1" />
				</div>
			</template>
		</div>
		<span v-if="!isObject" class="primitive" :class="valueType">
			<UTooltip v-if="typeof data === 'string'" text="Copy value">
				<span class="string-value" @click="copyValue(data)">{{ formatValue(data) }}</span>
			</UTooltip>
			<template v-else>{{ formatValue(data) }}</template>
		</span>
	</div>
</template>
<script lang="ts">
import { defineComponent, ref, computed } from 'vue'

export default defineComponent({
	name: 'Item',
	props: {
		data: {
			type: [Object, Array, String, Number, Boolean],
			required: true
		},
		depth: {
			type: Number,
			default: 0
		}
	},
	setup(props) {
		const toast = useToast()

		const isExpanded = ref(true)

		const isObject = computed(() =>
			typeof props.data === 'object' && props.data !== null
		)

		const isArray = computed(() =>
			Array.isArray(props.data)
		)

		const valueType = computed(() =>
			typeof props.data
		)

		const toggle = () => {
			isExpanded.value = !isExpanded.value
		}

		const formatValue = (value: any): string => {
			if (typeof value === 'string') return `"${value}"`
			return String(value)
		}

		const copyValue = (value: string) => {
			copyToClipboard(value)
			toast.add({
				color: 'primary',
				description: 'Value copied to clipboard'
			})
		}

		return {
			isExpanded,
			isObject,
			isArray,
			valueType,
			toggle,
			formatValue,
			copyValue
		}
	}
})
</script>
<style scoped>
.json-viewer-item {
	line-height: 1.5;
}

.item-content {
	cursor: pointer;
	display: flex;
	align-items: center;
}

.toggle-icon {
	font-size: 0.8em;
	margin-right: 4px;
	color: #666;
}

.key {
	color: #881391;
	margin-right: 4px;
}

.primitive {
	margin-left: 4px;
}

.primitive.string {
	color: #c41a16;
	word-break: break-word;
	white-space: pre-wrap;
}

.string-value {
	cursor: pointer;
}

.primitive.number {
	color: #1a01ff;
}

.primitive.boolean {
	color: #0000ff;
}

.nested-content {
	margin-left: 10px;
}

.array-item,
.object-item {
	display: flex;
	align-items: flex-start;
}
</style>
