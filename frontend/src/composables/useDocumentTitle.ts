import { onMounted, onUnmounted } from 'vue'

export function useDocumentTitle(title: string) {
  const previousTitle = document.title

  onMounted(() => {
    document.title = title
  })

  onUnmounted(() => {
    document.title = previousTitle
  })
}
