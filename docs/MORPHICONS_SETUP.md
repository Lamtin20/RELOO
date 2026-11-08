# Morphicons in RELOO

RELOO uses `morphicons@1.7.1` with the React binding and `lucide@1.24.0` icon data, aligned with the existing `lucide-react@1.24.0` components. The upstream source is [guillermolg00/morphicons](https://github.com/guillermolg00/morphicons), licensed under MIT.

`components/ui/MorphIcon.jsx` sets RELOO's stroke defaults, the snappy spring, stable SVG dimensions and `reducedMotion="user"`. It forwards the library's imperative ref and controlled-animation props. The SVG is decorative by default; interactive controls retain their accessible names and tooltips.

```jsx
import { Menu, X } from 'lucide';
import { MorphIcon } from '@/components/ui/MorphIcon';

<button type="button" aria-label={open ? 'Close menu' : 'Open menu'}>
  <MorphIcon icon={open ? X : Menu} size={20} />
</button>
```

Import morphable icon data from `lucide`, not React components from `lucide-react`. Keep static React icons where no state transition is needed. Do not create icon arrays during rendering: the library caches stable imported data references.

The current integration covers category/account menus and notification state in the header, mobile navigation, saved-listing hearts, password visibility, the support panel/send state and account verification status. Animations occur when the underlying state changes; there is no decorative animation loop. SSR emits a real static path before hydration, and the runtime respects the operating system's reduced-motion preference.

Verification uses browser path-mutation checks, keyboard controls, reduced-motion emulation and desktop/mobile screenshots. The production build runs on the homelab through the existing Tailscale SSH connection; no database migration is needed.
