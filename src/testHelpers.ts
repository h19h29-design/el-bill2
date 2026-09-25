import { act, fireEvent, screen } from "@testing-library/react"

const proDrawerTitleByNavLabel: Record<string, string> = {
  "쉬운 진단": "쉬운 진단 마법사",
  "자동진단": "전문 자동진단",
  "사용 안내": "전체 사용 안내",
}

export const openProView = async (navLabel: string) => {
  // The energy landing exposes the same features through 전체 메뉴.
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const menuButton = screen.queryByRole("button", { name: "전체 메뉴" })
    const toolsButton = screen.queryByRole("button", { name: "전문 기능" })
    if (menuButton) {
      fireEvent.click(menuButton)
      const menuDialog = document.querySelector(".menu-dialog")
      if (!menuDialog) {
        throw new Error("전체 메뉴가 열리지 않았습니다.")
      }
      const item = Array.from(
        menuDialog.querySelectorAll<HTMLButtonElement>("button.feature-link"),
      ).find((button) => button.textContent?.trim() === navLabel)
      if (!item) {
        throw new Error("전체 메뉴에서 항목을 찾지 못했습니다: " + navLabel)
      }
      fireEvent.click(item)
      await act(async () => {
        await Promise.resolve()
      })
      return
    }
    if (toolsButton) {
      fireEvent.click(toolsButton)
      break
    }
    await act(async () => {
      await Promise.resolve()
    })
  }
  const drawer = document.querySelector(".eb-drawer")
  if (!drawer) {
    throw new Error("전문 기능 경로를 찾지 못했습니다.")
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

// Dismisses the energy landing so tests reach the simple input screen.
export const dismissLanding = async () => {
  const cta = screen.queryByRole("button", {
    name: "전기요금 절감 확인하기",
  })
  if (cta) {
    fireEvent.click(cta)
    await act(async () => {
      await Promise.resolve()
    })
  }
}
