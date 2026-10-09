/*!
 * Adaally Slider
 * Vanilla JS carousel built to support WCAG 2.1 AA — no dependencies
 * MIT License
 */
const NS = 'adaally';
const PREFIX = `${NS}-slider`;
// Default icons render as inline SVG so they inherit `currentColor`,
// scale crisply at any button size, and don't depend on a system font.
const DEFAULT_ICONS = {
    prev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 6 9 12 15 18"></polyline></svg>',
    next: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 6 15 12 9 18"></polyline></svg>',
    play: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><polygon points="6,4 20,12 6,20"></polygon></svg>',
    pause: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>',
};
const liveRegions = new WeakMap();
function getLiveRegion(root) {
    const container = root.closest('dialog[open], [role="dialog"], [role="alertdialog"]') ||
        document.body;
    let el = container.querySelector(`:scope > .${PREFIX}__sr-status`);
    if (!el) {
        // Must be in the DOM (empty) before its text is set, or the first
        // announcement is dropped by some screen readers.
        el = document.createElement('div');
        el.className = `${PREFIX}__sr-status`;
        el.setAttribute('aria-live', 'polite');
        el.setAttribute('aria-atomic', 'true');
        container.appendChild(el);
    }
    let region = liveRegions.get(el);
    if (!region) {
        region = { el, owner: null, setTimer: null, clearTimer: null };
        liveRegions.set(el, region);
    }
    return region;
}
function cancelLiveTimers(region) {
    if (region.setTimer !== null)
        clearTimeout(region.setTimer);
    if (region.clearTimer !== null)
        clearTimeout(region.clearTimer);
    region.setTimer = null;
    region.clearTimer = null;
}
function clearLiveRegion(region, owner) {
    // Another slider may have taken over the shared region since.
    if (region.owner !== owner)
        return;
    cancelLiveTimers(region);
    region.el.textContent = '';
    region.owner = null;
}
// Screen readers only re-announce a `polite` live region when its text
// actually changes. A page-by-page carousel repeats the exact same
// count message ("Showing 3 new slides") on every click, so a plain
// textContent assignment gets silently swallowed after the first one.
// Clearing the region and setting the new text on a fresh task forces a
// real DOM mutation every time, regardless of whether the text repeats.
function announceOnRegion(region, owner, text, clearDelay) {
    cancelLiveTimers(region);
    region.owner = owner;
    region.el.textContent = '';
    region.setTimer = setTimeout(() => {
        region.setTimer = null;
        region.el.textContent = text;
        region.clearTimer = setTimeout(() => {
            region.clearTimer = null;
            region.el.textContent = '';
            region.owner = null;
        }, clearDelay);
    }, 50);
}
// Visible text of a node for announcements: words are joined with spaces
// (adjacent inline elements have no whitespace between them in the markup,
// which would otherwise glue them together) and anything hidden from
// assistive tech is skipped.
function collectText(node, out) {
    if (node.nodeType === Node.TEXT_NODE) {
        const t = (node.textContent || '').trim();
        if (t)
            out.push(t);
        return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE)
        return;
    const el = node;
    if (el.getAttribute('aria-hidden') === 'true' ||
        el.hidden ||
        /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE)$/.test(el.tagName))
        return;
    el.childNodes.forEach((child) => collectText(child, out));
}
const defaults = {
    autoplay: false,
    interval: 5000,
    loop: true,
    keyboard: true,
    pauseOnHover: true,
    pauseOnFocus: true,
    showDots: true,
    showArrows: true,
    slidesPerView: 1,
    slidesToScroll: 1,
    transition: 'slide',
    revealControls: false,
    playButtonPosition: 'top-left',
    dotsShape: 'dot',
    dotsPosition: 'overlay',
    liveRegionClearDelay: 2000,
    icons: {},
    labels: {
        carousel: 'Carousel',
        previous: 'Previous slide',
        next: 'Next slide',
        play: 'Start automatic slide show',
        pause: 'Stop automatic slide show',
        slide: (i, total) => `${i} of ${total}`,
        goTo: (i) => `Go to slide ${i}`,
        slideAnnouncement: (content, i, total) => content || `Slide ${i} of ${total}`,
        multiSlideAnnouncement: (count) => `Showing ${count} new slide${count === 1 ? '' : 's'}`,
        tablist: 'Slide navigation',
    },
};
const instances = new WeakMap();
export class AdaallySlider {
    constructor(root, options = {}) {
        this.index = 0;
        this.playing = false;
        this.reducedMotion = false;
        this.slides = [];
        this.timer = null;
        this.held = false;
        this.hovering = false;
        this.focusWithin = false;
        this.currentPerView = 1;
        // Arrow keys only fire when focus is on a carousel control (APG guidance),
        // so users tabbing through slide content keep normal arrow-key behavior.
        this.onKey = (e) => {
            const target = e.target;
            if (!target)
                return;
            // Tablist behavior: when focus is on a dot, arrows move focus BETWEEN dots
            // (each representing a page) and activate the target dot.
            if (target.closest(`.${PREFIX}__dots`) && this.dotButtons) {
                const currentDotIndex = this.dotButtons.indexOf(target);
                if (currentDotIndex < 0)
                    return;
                let newIndex = null;
                switch (e.key) {
                    case 'ArrowLeft':
                        newIndex = currentDotIndex - 1;
                        break;
                    case 'ArrowRight':
                        newIndex = currentDotIndex + 1;
                        break;
                    case 'Home':
                        newIndex = 0;
                        break;
                    case 'End':
                        newIndex = this.dotButtons.length - 1;
                        break;
                    default: return;
                }
                e.preventDefault();
                if (newIndex < 0)
                    newIndex = this.dotButtons.length - 1;
                if (newIndex >= this.dotButtons.length)
                    newIndex = 0;
                this.goTo(this.dotPageIndex(newIndex));
                this.dotButtons[newIndex].focus();
                return;
            }
            // Controls behavior: arrows on prev/next/play advance the slider itself.
            if (!target.closest(`.${PREFIX}__controls`))
                return;
            switch (e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    this.prev();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.next();
                    break;
                case 'Home':
                    e.preventDefault();
                    this.goTo(0);
                    break;
                case 'End':
                    e.preventDefault();
                    this.goTo(this.maxIndex());
                    break;
            }
        };
        this.onResize = () => {
            const prev = this.currentPerView;
            this.currentPerView = this.computePerView();
            const perViewChanged = prev !== this.currentPerView;
            if (perViewChanged) {
                this.root.style.setProperty('--adaally-per-view', String(this.currentPerView));
                const max = this.maxIndex();
                if (this.index > max)
                    this.index = max;
                this.rebuildDots();
            }
            this.update();
        };
        const el = typeof root === 'string'
            ? document.querySelector(root)
            : root;
        if (!el)
            throw new Error('AdaallySlider: root element not found');
        const existing = instances.get(el);
        if (existing)
            return existing;
        this.root = el;
        instances.set(el, this);
        this.options = {
            ...defaults,
            ...options,
            labels: { ...defaults.labels, ...(options.labels || {}) },
            icons: { ...defaults.icons, ...(options.icons || {}) },
        };
        const mm = typeof window !== 'undefined' && window.matchMedia
            ? window.matchMedia('(prefers-reduced-motion: reduce)')
            : null;
        this.reducedMotion = !!(mm && mm.matches);
        if (mm && typeof mm.addEventListener === 'function') {
            mm.addEventListener('change', (e) => {
                this.reducedMotion = e.matches;
                this.root.classList.toggle(`${PREFIX}--reduced-motion`, this.reducedMotion);
                if (this.reducedMotion && this.playing)
                    this.pause();
            });
        }
        this.setup();
    }
    setup() {
        const root = this.root;
        const opts = this.options;
        root.classList.add(PREFIX);
        if (opts.transition === 'fade')
            root.classList.add(`${PREFIX}--fade`);
        if (opts.revealControls)
            root.classList.add(`${PREFIX}--reveal-controls`);
        // Build viewport > track > slides structure
        let viewport = root.querySelector(`:scope > .${PREFIX}__viewport`);
        if (!viewport) {
            viewport = document.createElement('div');
            viewport.className = `${PREFIX}__viewport`;
            while (root.firstChild)
                viewport.appendChild(root.firstChild);
            root.appendChild(viewport);
        }
        this.viewport = viewport;
        let track = viewport.querySelector(`:scope > .${PREFIX}__track`);
        if (!track) {
            track = document.createElement('div');
            track.className = `${PREFIX}__track`;
            while (viewport.firstChild)
                track.appendChild(viewport.firstChild);
            viewport.appendChild(track);
        }
        this.track = track;
        this.slides = Array.from(track.querySelectorAll(`:scope > .${PREFIX}__slide`));
        if (this.slides.length === 0) {
            this.slides = Array.from(track.children);
            this.slides.forEach((s) => s.classList.add(`${PREFIX}__slide`));
        }
        // WAI-ARIA APG carousel pattern: region landmark
        if (!root.getAttribute('role'))
            root.setAttribute('role', 'region');
        root.setAttribute('aria-roledescription', 'carousel');
        if (opts.label) {
            root.setAttribute('aria-label', opts.label);
        }
        else if (!root.hasAttribute('aria-label') && !root.hasAttribute('aria-labelledby')) {
            root.setAttribute('aria-label', opts.labels.carousel);
        }
        this.slides.forEach((slide, i) => {
            slide.setAttribute('role', 'group');
            slide.setAttribute('aria-roledescription', 'slide');
            slide.setAttribute('aria-label', opts.labels.slide(i + 1, this.slides.length));
        });
        // Slide-change announcements go through a single live region shared by
        // all sliders and mounted at the end of <body> (see getLiveRegion).
        // The track itself stays aria-live="off" so multi-slide swaps don't
        // spam a screen reader.
        this.live = getLiveRegion(root);
        this.currentPerView = this.computePerView();
        root.style.setProperty('--adaally-per-view', String(this.currentPerView));
        this.buildControls();
        this.update();
        if (opts.keyboard)
            root.addEventListener('keydown', this.onKey);
        // Focus-within is tracked unconditionally — it gates whether
        // autoplay-driven slide changes announce to screen readers (see
        // updateStatus). Whether hover / focus also PAUSE autoplay is a
        // separate decision, controlled by pauseOnHover / pauseOnFocus.
        root.addEventListener('mouseenter', () => { this.hovering = true; this.syncHold(); });
        root.addEventListener('mouseleave', () => { this.hovering = false; this.syncHold(); });
        root.addEventListener('focusin', () => { this.focusWithin = true; this.syncHold(); });
        root.addEventListener('focusout', (e) => {
            if (!root.contains(e.relatedTarget)) {
                this.focusWithin = false;
                this.syncHold();
                // Focus left the carousel: drop any announcement still sitting in
                // the shared region so it can't be found later as stale text.
                clearLiveRegion(this.live, root);
            }
        });
        if (typeof window !== 'undefined') {
            window.addEventListener('resize', this.onResize);
        }
        if (this.reducedMotion)
            root.classList.add(`${PREFIX}--reduced-motion`);
        if (opts.autoplay && !this.reducedMotion)
            this.play();
        else
            this.updatePlayButton();
    }
    computePerView() {
        const spv = this.options.slidesPerView;
        if (typeof spv === 'number')
            return Math.max(1, Math.floor(spv));
        if (typeof window === 'undefined')
            return 1;
        const width = window.innerWidth;
        const breakpoints = Object.keys(spv).map(Number).sort((a, b) => a - b);
        let n = 1;
        for (const bp of breakpoints) {
            if (width >= bp)
                n = spv[bp];
        }
        return Math.max(1, Math.floor(n));
    }
    effectivePerView() {
        return this.options.transition === 'fade' ? 1 : this.currentPerView;
    }
    maxIndex() {
        return Math.max(0, this.slides.length - this.effectivePerView());
    }
    buildControls() {
        const opts = this.options;
        const root = this.root;
        const controls = document.createElement('div');
        controls.className = `${PREFIX}__controls`;
        if (opts.showArrows) {
            this.prevBtn = this.makeButton(`${PREFIX}__prev`, opts.labels.previous);
            this.applyIcon(this.prevBtn, opts.icons.prev, DEFAULT_ICONS.prev);
            this.prevBtn.addEventListener('click', () => this.prev());
            this.nextBtn = this.makeButton(`${PREFIX}__next`, opts.labels.next);
            this.applyIcon(this.nextBtn, opts.icons.next, DEFAULT_ICONS.next);
            this.nextBtn.addEventListener('click', () => this.next());
            controls.appendChild(this.prevBtn);
            controls.appendChild(this.nextBtn);
        }
        root.appendChild(controls);
        if (opts.autoplay) {
            this.playBtn = this.makeButton(`${PREFIX}__play`, opts.labels.pause);
            this.playBtn.classList.add(`${PREFIX}__play--${opts.playButtonPosition}`);
            // Icon is set/swapped in updatePlayButton.
            this.playBtn.addEventListener('click', () => this.toggle());
            // Insert as the FIRST child of the root so that Tab reaches the pause
            // control before any slide content — a keyboard user autoplay-pauses
            // in one keystroke.
            root.insertBefore(this.playBtn, root.firstChild);
        }
        if (opts.showDots)
            this.rebuildDots();
    }
    makeButton(cls, label) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = cls;
        b.setAttribute('aria-label', label);
        return b;
    }
    applyIcon(btn, custom, defaultSvg) {
        // Author-supplied HTML from options is trusted markup by definition.
        btn.innerHTML = custom || defaultSvg;
        btn.classList.toggle(`${PREFIX}__btn--custom-icon`, !!custom);
    }
    rebuildDots() {
        if (!this.options.showDots)
            return;
        const opts = this.options;
        const existing = this.root.querySelector(`:scope > .${PREFIX}__dots`);
        if (existing)
            existing.remove();
        const dots = document.createElement('div');
        dots.className = `${PREFIX}__dots`;
        // WAI-ARIA tablist pattern for the dots: role="tablist" on the container,
        // role="tab" on each dot, aria-selected + roving tabindex, arrow-key nav.
        dots.setAttribute('role', 'tablist');
        dots.setAttribute('aria-label', opts.labels.tablist);
        if (opts.dotsShape === 'line')
            dots.classList.add(`${PREFIX}__dots--lines`);
        dots.classList.add(`${PREFIX}__dots--${opts.dotsPosition}`);
        const count = this.dotPageCount();
        this.dotButtons = [];
        for (let i = 0; i < count; i++) {
            const btn = this.makeButton(`${PREFIX}__dot`, opts.labels.goTo(i + 1));
            btn.setAttribute('role', 'tab');
            btn.setAttribute('aria-selected', 'false');
            btn.setAttribute('tabindex', '-1');
            const target = this.dotPageIndex(i);
            btn.addEventListener('click', () => this.goTo(target));
            dots.appendChild(btn);
            this.dotButtons.push(btn);
        }
        this.root.appendChild(dots);
    }
    dotPageCount() {
        const step = Math.max(1, this.options.slidesToScroll);
        return Math.max(1, Math.ceil((this.maxIndex() + 1) / step));
    }
    dotPageIndex(dotI) {
        const step = Math.max(1, this.options.slidesToScroll);
        return Math.min(this.maxIndex(), dotI * step);
    }
    activeDotIndex() {
        const step = Math.max(1, this.options.slidesToScroll);
        return Math.min(this.dotPageCount() - 1, Math.floor(this.index / step));
    }
    syncHold() {
        const shouldHold = (this.hovering && this.options.pauseOnHover) ||
            (this.focusWithin && this.options.pauseOnFocus);
        this.hold(shouldHold);
    }
    hold(hold) {
        this.held = hold;
        if (hold)
            this.clearTimer();
        else if (this.playing)
            this.scheduleNext();
    }
    clearTimer() {
        if (this.timer !== null) {
            clearTimeout(this.timer);
            this.timer = null;
        }
    }
    scheduleNext() {
        this.clearTimer();
        this.timer = setTimeout(() => {
            this.next(true);
            if (this.playing && !this.held)
                this.scheduleNext();
        }, this.options.interval);
    }
    play() {
        if (this.reducedMotion)
            return;
        this.playing = true;
        this.updatePlayButton();
        if (!this.held)
            this.scheduleNext();
        this.emit('play');
    }
    pause() {
        this.playing = false;
        this.clearTimer();
        this.updatePlayButton();
        this.emit('pause');
    }
    toggle() {
        if (this.playing)
            this.pause();
        else
            this.play();
    }
    updatePlayButton() {
        if (!this.playBtn)
            return;
        const { play, pause } = this.options.labels;
        const { icons } = this.options;
        this.playBtn.setAttribute('aria-label', this.playing ? pause : play);
        this.playBtn.setAttribute('aria-pressed', String(this.playing));
        this.playBtn.classList.toggle(`${PREFIX}__play--playing`, this.playing);
        const customHtml = this.playing ? icons.pause : icons.play;
        const defaultSvg = this.playing ? DEFAULT_ICONS.pause : DEFAULT_ICONS.play;
        this.applyIcon(this.playBtn, customHtml, defaultSvg);
    }
    next(auto = false) {
        const step = Math.max(1, this.options.slidesToScroll);
        const per = this.effectivePerView();
        let i = this.index + step;
        const max = this.maxIndex();
        let wrapped = false;
        if (i > max) {
            if (!this.options.loop)
                return;
            i = 0;
            wrapped = true;
        }
        // How many slides are genuinely new to the view: the configured
        // scroll step, capped at what's visible — except when looping wraps
        // back to the start, where the whole window is a fresh view rather
        // than a single-step reveal.
        const revealed = wrapped ? per : Math.min(step, per);
        // Moving forward, the slide that just scrolled INTO view is the
        // trailing edge of the new window, not the leading slide (which was
        // likely already visible before this step when slidesPerView > 1).
        const revealedIndex = Math.min(this.slides.length - 1, i + per - 1);
        this.goTo(i, auto, revealed, revealedIndex);
    }
    prev() {
        const step = Math.max(1, this.options.slidesToScroll);
        const per = this.effectivePerView();
        let i = this.index - step;
        let wrapped = false;
        if (i < 0) {
            if (!this.options.loop)
                return;
            i = this.maxIndex();
            wrapped = true;
        }
        const revealed = wrapped ? per : Math.min(step, per);
        // Moving backward, the newly revealed slide is the leading edge —
        // the new first-visible slide.
        this.goTo(i, false, revealed, i);
    }
    goTo(i, auto = false, revealed, revealedIndex) {
        const max = this.maxIndex();
        const clamped = Math.max(0, Math.min(i, max));
        if (clamped === this.index)
            return;
        const previous = this.index;
        this.index = clamped;
        const per = this.effectivePerView();
        // Direct jumps (dot click, keyboard Home/End) don't know a "step" —
        // fall back to how many slides actually differ from before, capped
        // at what's visible.
        const finalRevealed = revealed !== null && revealed !== void 0 ? revealed : Math.min(Math.abs(clamped - previous), per);
        const finalRevealedIndex = revealedIndex !== null && revealedIndex !== void 0 ? revealedIndex : clamped;
        this.update(auto, finalRevealed, finalRevealedIndex);
        this.emit('change', { index: clamped, previous });
    }
    update(auto = false, revealed = 1, revealedIndex = this.index) {
        const per = this.effectivePerView();
        this.slides.forEach((slide, i) => {
            const visible = i >= this.index && i < this.index + per;
            slide.classList.toggle(`${PREFIX}__slide--active`, visible);
            slide.setAttribute('aria-hidden', String(!visible));
            this.setInert(slide, !visible);
        });
        this.applyTransform();
        if (this.dotButtons) {
            const active = this.activeDotIndex();
            this.dotButtons.forEach((btn, i) => {
                const isActive = i === active;
                btn.classList.toggle(`${PREFIX}__dot--active`, isActive);
                btn.setAttribute('aria-selected', String(isActive));
                // Roving tabindex — only the active tab is in the tab sequence.
                btn.setAttribute('tabindex', isActive ? '0' : '-1');
                if (isActive)
                    btn.setAttribute('aria-current', 'true');
                else
                    btn.removeAttribute('aria-current');
            });
        }
        if (!this.options.loop) {
            const max = this.maxIndex();
            if (this.prevBtn)
                this.prevBtn.disabled = this.index === 0;
            if (this.nextBtn)
                this.nextBtn.disabled = this.index >= max;
        }
        this.updateStatus(auto, revealed, revealedIndex);
    }
    applyTransform() {
        if (this.options.transition === 'fade') {
            this.track.style.transform = '';
            return;
        }
        const step = this.slideStep();
        this.track.style.transform = `translate3d(${-this.index * step}px, 0, 0)`;
    }
    slideStep() {
        if (this.slides.length === 0)
            return 0;
        if (this.slides.length > 1) {
            const a = this.slides[0].getBoundingClientRect();
            const b = this.slides[1].getBoundingClientRect();
            return b.left - a.left;
        }
        return this.slides[0].getBoundingClientRect().width;
    }
    updateStatus(auto = false, revealed = 1, revealedIndex = this.index) {
        // Autoplay-driven changes only announce while keyboard focus is inside
        // the carousel — otherwise a screen reader user gets unsolicited
        // announcements for a carousel they aren't even looking at. (Mouse
        // hover isn't a screen-reader signal, so it doesn't count.) Manual
        // navigation (click, keyboard, dot) always announces, since it's a
        // direct result of the user's own action.
        if (auto && !this.focusWithin)
            return;
        // Branch on how many slides actually moved this step (slidesToScroll),
        // not how many are simultaneously visible (slidesPerView) — a carousel
        // showing 3 at once but scrolling 1 at a time only has ONE genuinely
        // new slide per step, so it should announce that slide's content, not
        // a misleading "3 new slides".
        if (revealed <= 1) {
            const content = this.getSlideAnnouncement(this.slides[revealedIndex]);
            this.announce(this.options.labels.slideAnnouncement(content, revealedIndex + 1, this.slides.length));
        }
        else {
            // Several slides moved in one step: reading every slide's content
            // would be noisy, so announce a simple count instead.
            this.announce(this.options.labels.multiSlideAnnouncement(revealed));
        }
    }
    announce(text) {
        announceOnRegion(this.live, this.root, text, this.options.liveRegionClearDelay);
    }
    // Accessible text for a single slide. Authors can curate it with
    // `data-adaally-announce="..."` on the slide; otherwise it's the slide's
    // visible text (space-separated, aria-hidden content skipped), falling
    // back to the alt text of an image, falling back to nothing (the caller
    // falls back to a position label in that case).
    getSlideAnnouncement(slide) {
        var _a;
        const custom = (_a = slide.getAttribute(`data-${NS}-announce`)) === null || _a === void 0 ? void 0 : _a.trim();
        if (custom)
            return custom;
        const parts = [];
        slide.childNodes.forEach((child) => collectText(child, parts));
        const text = parts.join(' ').replace(/\s+/g, ' ').trim();
        if (text)
            return text;
        const img = slide.querySelector('img[alt]');
        return (img === null || img === void 0 ? void 0 : img.alt.trim()) || '';
    }
    // Take non-visible slides out of the tab order so keyboard/AT users
    // don't reach hidden content.
    setInert(slide, inert) {
        if ('inert' in slide)
            slide.inert = inert;
        const focusables = slide.querySelectorAll('a[href], button, input, select, textarea, [tabindex]');
        focusables.forEach((el) => {
            var _a, _b;
            if (inert) {
                if (el.getAttribute('data-adaally-ti') === null) {
                    el.setAttribute('data-adaally-ti', (_a = el.getAttribute('tabindex')) !== null && _a !== void 0 ? _a : '');
                }
                el.setAttribute('tabindex', '-1');
            }
            else if (el.hasAttribute('data-adaally-ti')) {
                const orig = (_b = el.getAttribute('data-adaally-ti')) !== null && _b !== void 0 ? _b : '';
                if (orig === '')
                    el.removeAttribute('tabindex');
                else
                    el.setAttribute('tabindex', orig);
                el.removeAttribute('data-adaally-ti');
            }
        });
    }
    emit(type, detail) {
        this.root.dispatchEvent(new CustomEvent(`${NS}:${type}`, { detail, bubbles: true }));
    }
    destroy() {
        this.clearTimer();
        clearLiveRegion(this.live, this.root);
        if (typeof window !== 'undefined')
            window.removeEventListener('resize', this.onResize);
        instances.delete(this.root);
    }
}
export function autoInit(scope) {
    const root = scope !== null && scope !== void 0 ? scope : (typeof document !== 'undefined' ? document : null);
    if (!root)
        return [];
    return Array.from(root.querySelectorAll(`[data-${NS}-slider]`)).map((el) => {
        let opts = {};
        const raw = el.getAttribute(`data-${NS}-slider`);
        if (raw && raw.trim().startsWith('{')) {
            try {
                opts = JSON.parse(raw);
            }
            catch {
                // ignore malformed JSON
            }
        }
        return new AdaallySlider(el, opts);
    });
}
if (typeof document !== 'undefined') {
    if (document.readyState !== 'loading')
        autoInit();
    else
        document.addEventListener('DOMContentLoaded', () => autoInit());
}
export default AdaallySlider;
