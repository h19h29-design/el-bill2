import { act, fireEvent, screen } from "@testing-library/react"

const proDrawerTitleByNavLabel: Record<string, string> = {
  "쉬운 진단": "쉬운 진단 마법사",
  "자동진단": "전문 자동진단",
  "사용 안내": "전체 사용 안내",
}

export const openProView = async (navLabel: string) => {
  let toolsButton: HTMLElement | null = null
  for (let attempt = 0; attempt < 50; attempt += 1) {
    toolsButton = screen.queryByRole("button", { name: "전문 기능" })
    if (toolsButton) break
    await act(async () => {
      await Promise.resolve()
    })
  }
  if (!toolsButton) {
    throw new Error("전문 기능 버튼을 찾지 못했습니다.")
  }
  fireEvent.click(toolsButton)
  const drawer = document.querySelector(".eb-drawer")
  if (!drawer) {
    throw new Error("전문 기능 서랍이 열리지 않았습니다.")
  }
  const title = proDrawerTitleByNavLabel[navLabel] ?? navLabel
  const item = drawer.querySelector<HTMLButtonElement>(
    "button[aria-label=\"" + title + "\"]",
  )
  if (!item) {
    throw new Error("전문 기능 서랍에서 항목을 찾지 못했습니다: " + title)
  }
  fireEvent.click(item)
  await act(async () => {
    await Promise.resolve()
  })
}
