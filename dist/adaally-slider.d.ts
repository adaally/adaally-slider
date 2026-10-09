/*!
 * Adaally Slider
 * Vanilla JS carousel built to support WCAG 2.1 AA — no dependencies
 * MIT License
 */
export interface AdaallyLabels {
    carousel: string;
    previous: string;
    next: string;
    play: string;
    pause: string;
    slide: (i: number, total: number) => string;
    goTo: (i: number) => string;
    slideAnnouncement: (content: string, i: number, total: number) => string;
    multiSlideAnnouncement: (count: number) => string;
    tablist: string;
}
export type DotsShape = 'dot' | 'line';
export type DotsPosition = 'overlay' | 'below';
export interface AdaallyIcons {
    prev?: string;
    next?: string;
    play?: string;
    pause?: string;
}
export type SlidesPerView = number | Record<number, number>;
export type PlayButtonPosition = 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
export interface AdaallyOptions {
    autoplay?: boolean;
    interval?: number;
    loop?: boolean;
    keyboard?: boolean;
    pauseOnHover?: boolean;
    pauseOnFocus?: boolean;
    showDots?: boolean;
    showArrows?: boolean;
    slidesPerView?: SlidesPerView;
    slidesToScroll?: number;
    transition?: 'slide' | 'fade';
    label?: string;
    icons?: AdaallyIcons;
    labels?: Partial<AdaallyLabels>;
    revealControls?: boolean;
    playButtonPosition?: PlayButtonPosition;
    dotsShape?: DotsShape;
    dotsPosition?: DotsPosition;
    /** ms before the screen-reader announcement text is cleared (default 2000). */
    liveRegionClearDelay?: number;
}
interface ResolvedOptions {
    autoplay: boolean;
    interval: number;
    loop: boolean;
    keyboard: boolean;
    pauseOnHover: boolean;
    pauseOnFocus: boolean;
    showDots: boolean;
    showArrows: boolean;
    slidesPerView: SlidesPerView;
    slidesToScroll: number;
    transition: 'slide' | 'fade';
    label?: string;
    icons: AdaallyIcons;
    labels: AdaallyLabels;
    revealControls: boolean;
    playButtonPosition: PlayButtonPosition;
    dotsShape: DotsShape;
    dotsPosition: DotsPosition;
    liveRegionClearDelay: number;
}
export interface AdaallyChangeDetail {
    index: number;
    previous: number;
}
export declare class AdaallySlider {
    root: HTMLElement;
    options: ResolvedOptions;
    index: number;
    playing: boolean;
    reducedMotion: boolean;
    private viewport;
    private track;
    private slides;
    private live;
    private prevBtn?;
    private nextBtn?;
    private playBtn?;
    private dotButtons?;
    private timer;
    private held;
    private hovering;
    private focusWithin;
    private currentPerView;
    constructor(root: HTMLElement | string, options?: AdaallyOptions);
    private setup;
    private computePerView;
    private effectivePerView;
    private maxIndex;
    private buildControls;
    private makeButton;
    private applyIcon;
    private rebuildDots;
    private dotPageCount;
    private dotPageIndex;
    private activeDotIndex;
    private onKey;
    private onResize;
    private syncHold;
    private hold;
    private clearTimer;
    private scheduleNext;
    play(): void;
    pause(): void;
    toggle(): void;
    private updatePlayButton;
    next(auto?: boolean): void;
    prev(): void;
    goTo(i: number, auto?: boolean, revealed?: number, revealedIndex?: number): void;
    private update;
    private applyTransform;
    private slideStep;
    private updateStatus;
    private announce;
    private getSlideAnnouncement;
    private setInert;
    private emit;
    destroy(): void;
}
export declare function autoInit(scope?: ParentNode): AdaallySlider[];
export default AdaallySlider;
