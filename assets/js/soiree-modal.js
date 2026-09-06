/**
 * Homepage popup for the 5th Anniversary Celebration Soirée.
 *
 * Shows once, then stays hidden for DISMISS_DAYS after the visitor closes it,
 * and stops appearing entirely once the event has passed.
 */
(function () {
    'use strict';

    var STORAGE_KEY = 'wr_soiree_2026_dismissed';
    var DISMISS_DAYS = 7;
    var OPEN_DELAY_MS = 1200;
    var EVENT_END = new Date('2026-11-13T00:00:00-06:00');

    var overlay = document.getElementById('soiree-modal');
    if (!overlay) return;

    // Don't promote an event that has already happened.
    if (new Date() >= EVENT_END) {
        overlay.remove();
        return;
    }

    function recentlyDismissed() {
        try {
            var stamp = window.localStorage.getItem(STORAGE_KEY);
            if (!stamp) return false;
            var elapsed = Date.now() - parseInt(stamp, 10);
            return elapsed < DISMISS_DAYS * 24 * 60 * 60 * 1000;
        } catch (e) {
            return false; // Private browsing / storage disabled
        }
    }

    function remember() {
        try {
            window.localStorage.setItem(STORAGE_KEY, String(Date.now()));
        } catch (e) {
            /* nothing we can do — modal simply reappears next visit */
        }
    }

    var lastFocused = null;

    function open() {
        lastFocused = document.activeElement;
        overlay.classList.add('is-visible');
        overlay.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';

        var focusTarget = overlay.querySelector('.soiree-modal-close');
        if (focusTarget) focusTarget.focus();

        document.addEventListener('keydown', onKeydown);
    }

    function close() {
        overlay.classList.remove('is-visible');
        overlay.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        remember();

        document.removeEventListener('keydown', onKeydown);
        if (lastFocused && typeof lastFocused.focus === 'function') {
            lastFocused.focus();
        }
    }

    function onKeydown(e) {
        if (e.key === 'Escape' || e.key === 'Esc') {
            close();
            return;
        }

        // Keep tab focus inside the dialog while it is open.
        if (e.key !== 'Tab') return;
        var focusable = overlay.querySelectorAll('button, [href]');
        if (!focusable.length) return;
        var first = focusable[0];
        var last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    }

    overlay.querySelectorAll('[data-soiree-close]').forEach(function (el) {
        el.addEventListener('click', close);
    });

    // Click the backdrop (but not the dialog) to dismiss.
    overlay.addEventListener('click', function (e) {
        if (e.target === overlay) close();
    });

    // Buying a ticket counts as handled — don't re-prompt on return.
    var cta = overlay.querySelector('[data-soiree-cta]');
    if (cta) cta.addEventListener('click', remember);

    if (!recentlyDismissed()) {
        window.setTimeout(open, OPEN_DELAY_MS);
    }
})();
