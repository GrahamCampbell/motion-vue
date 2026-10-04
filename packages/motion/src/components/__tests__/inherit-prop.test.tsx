import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/vue'
import { motionValue } from 'framer-motion/dom'
import { defineComponent, nextTick } from 'vue'
import type { MotionState } from '@/state/motion-state'
import { Motion } from '@/components'
import { injectMotion } from '@/components/context'

const variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.000001 } },
}

/**
 * Regression test for https://github.com/motiondivision/motion-vue/issues/272
 *
 * Vue casts an absent `Boolean` prop to `false`, so `inherit` declared as
 * `{ type: Boolean }` reached motion-dom as `inherit: false` on every element.
 * motion-dom 13.5.1 walks `node.props.inherit !== false && node.parent` in
 * `VisualElement.mount()` when a variants-only child looks for the variant
 * node to join, so the chain was cut at the child itself: it never entered
 * its parent's `variantChildren` and never animated through the parent's
 * labels (nor via `delayChildren` / `staggerChildren`).
 */
describe('inherit prop default (#272)', () => {
  it('reads an absent inherit prop as undefined so a variants-only child joins the parent variant tree', async () => {
    let childState: MotionState | undefined

    const Probe = defineComponent({
      setup() {
        childState = injectMotion(null) as MotionState
        return () => null
      },
    })

    const App = defineComponent({
      setup() {
        return () => (
          <Motion variants={variants} initial="hidden" animate="visible">
            <Motion variants={variants}>
              <Probe />
            </Motion>
          </Motion>
        )
      },
    })

    render(App)
    await nextTick()

    expect(childState).toBeDefined()
    expect(childState?.visualElement.props.inherit).toBeUndefined()
    expect(childState?.parent?.visualElement.variantChildren?.size).toBe(1)
  })

  it('keeps an explicit inherit={false} as false', async () => {
    let childState: MotionState | undefined

    const Probe = defineComponent({
      setup() {
        childState = injectMotion(null) as MotionState
        return () => null
      },
    })

    const App = defineComponent({
      setup() {
        return () => (
          <Motion variants={variants} initial="hidden" animate="visible">
            <Motion variants={variants} inherit={false}>
              <Probe />
            </Motion>
          </Motion>
        )
      },
    })

    render(App)
    await nextTick()

    expect(childState).toBeDefined()
    expect(childState?.visualElement.props.inherit).toBe(false)
  })

  it('animates a variants-only child through the parent labels', async () => {
    const promise = new Promise((resolve) => {
      const opacity = motionValue(0)

      const App = defineComponent({
        setup() {
          return () => (
            <Motion variants={variants} initial="hidden" animate="visible">
              <Motion
                variants={variants}
                style={{ opacity }}
                onAnimationComplete={() => resolve(opacity.get())}
              />
            </Motion>
          )
        },
      })

      render(App)
    })

    await expect(promise).resolves.toBe(1)
  })
})
