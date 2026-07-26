document.addEventListener('DOMContentLoaded', () => {
    const loadingEl = document.getElementById('loading');
    const emptyStateEl = document.getElementById('empty-state');
    const contentEl = document.getElementById('analytics-content');
    
    const averageTimeEl = document.getElementById('average-time');
    const totalEmailsEl = document.getElementById('total-emails');
    const totalTimeEl = document.getElementById('total-time');

    chrome.storage.local.get({ timerSessions: [] }, (result) => {
        const sessions = result.timerSessions;
        loadingEl.classList.add('hidden');

        if (sessions.length === 0) {
            emptyStateEl.classList.remove('hidden');
            return;
        }

        contentEl.classList.remove('hidden');
        renderStats(sessions);
    });

    function renderStats(sessions) {
        const totalSessions = sessions.length;
        const totalSeconds = sessions.reduce((acc, session) => acc + session.seconds, 0);
        const averageSeconds = totalSeconds / totalSessions;

        averageTimeEl.textContent = formatMMSS(averageSeconds);
        totalEmailsEl.textContent = totalSessions;
        totalTimeEl.textContent = formatMMSS(totalSeconds);
    }

    function formatMMSS(totalSeconds) {
        const rounded = Math.round(totalSeconds);
        const m = Math.floor(rounded / 60);
        const s = rounded % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
});
