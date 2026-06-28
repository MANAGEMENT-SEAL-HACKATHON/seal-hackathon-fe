import { useCallback, useEffect, useState } from 'react';
import { message } from 'antd';
import { hackathonResultsService } from '../services/hackathonResults.service';
import { mapTeamRankings, mapChapterRankings, mapIndividualRankings } from '../mappers/ranking.mapper';
import { hackathonService } from '../../hackathons/services/hackathonService';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function pollUntil(fn, { attempts = 6, delayMs = 400, isDone }) {
  let last;
  for (let i = 0; i < attempts; i += 1) {
    last = await fn();
    if (isDone(last)) return last;
    await sleep(delayMs);
  }
  return last;
}

export function useHackathonResults(hackathonId) {
  const [loading, setLoading] = useState(true);
  const [hackathon, setHackathon] = useState(null);
  const [teamRankings, setTeamRankings] = useState([]);
  const [chapterRankings, setChapterRankings] = useState([]);
  const [individualRankings, setIndividualRankings] = useState([]);
  const [prizes, setPrizes] = useState([]);
  const [closing, setClosing] = useState(false);
  const [exporting, setExporting] = useState(false);

  const fetchRankings = useCallback(async (hackData, { pollChapter = false } = {}) => {
    const status = String(hackData?.status || '').toUpperCase();
    const individualEnabled = Boolean(
      hackData?.individual_ranking_enabled ?? hackData?.individualRankingEnabled
    );

    const [teamsRes, prizesRes] = await Promise.all([
      hackathonResultsService.getTeamRankings(hackathonId),
      hackathonResultsService.getPrizes(hackathonId),
    ]);
    setTeamRankings(mapTeamRankings(teamsRes));
    setPrizes(prizesRes);

    const loadChapter = async () => {
      const chaptersRes = await hackathonResultsService.getChapterRankings(hackathonId);
      return mapChapterRankings(chaptersRes);
    };

    if (pollChapter && status === 'FINISHED') {
      const chapters = await pollUntil(loadChapter, {
        isDone: (list) => Array.isArray(list) && list.length > 0,
      });
      setChapterRankings(chapters);
    } else if (status === 'PENDING_CONFIRM' || status === 'FINISHED') {
      try {
        const chaptersRes = await hackathonResultsService.getChapterRankings(hackathonId);
        setChapterRankings(mapChapterRankings(chaptersRes));
      } catch {
        setChapterRankings([]);
      }
    } else {
      setChapterRankings([]);
    }

    if (individualEnabled && status === 'FINISHED') {
      try {
        const indRes = await hackathonResultsService.getIndividualRankings(hackathonId);
        setIndividualRankings(mapIndividualRankings(indRes));
      } catch {
        setIndividualRankings([]);
      }
    } else {
      setIndividualRankings([]);
    }
  }, [hackathonId]);

  const fetchData = useCallback(async (options) => {
    if (!hackathonId) return;
    setLoading(true);
    try {
      const hackRes = await hackathonService.getById(hackathonId);
      const hackData = hackRes?.data || hackRes;
      setHackathon(hackData);
      await fetchRankings(hackData, options);
    } catch {
      message.error('Có lỗi xảy ra khi lấy dữ liệu bảng xếp hạng.');
    } finally {
      setLoading(false);
    }
  }, [hackathonId, fetchRankings]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleConfirmClosure = async (note = 'Ban tổ chức xác nhận chốt điểm') => {
    try {
      setClosing(true);
      await hackathonResultsService.confirmClosure(hackathonId, note);
      message.success('Đã khóa điểm và công bố kết quả thành công!');
      await fetchData({ pollChapter: true });
    } catch (error) {
      const msg = error.response?.data?.message || error.message;
      message.error(msg ? `Không thể chốt sổ: ${msg}` : 'Lỗi khi chốt sổ cuộc thi.');
    } finally {
      setClosing(false);
    }
  };

  const handleExportRankings = async () => {
    try {
      setExporting(true);
      const job = await hackathonResultsService.createExportJob(hackathonId, { type: 'CSV_RANKINGS' });
      const jobId = job?.id ?? job?.data?.id;
      if (!jobId) {
        message.error('Không tạo được export job.');
        return;
      }
      const blob = await hackathonResultsService.downloadExportFile(jobId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `rankings-hackathon-${hackathonId}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      message.success('Đã tải file xếp hạng.');
    } catch (error) {
      message.error(error.response?.data?.message || 'Xuất file thất bại.');
    } finally {
      setExporting(false);
    }
  };

  const handleRevokePrize = async (prizeId) => {
    try {
      await hackathonResultsService.revokePrize(prizeId);
      message.success('Đã thu hồi giải thưởng.');
      await fetchData();
    } catch (error) {
      const msg = error.response?.data?.message || error.message;
      message.error(msg ? `Không thể thu hồi giải: ${msg}` : 'Lỗi khi thu hồi giải thưởng.');
    }
  };

  const status = String(hackathon?.status || '').toUpperCase();
  const canAwardPrize = status === 'PENDING_CONFIRM';
  const canConfirm = status === 'PENDING_CONFIRM' && prizes.length > 0;
  const canRevokePrize = status === 'PENDING_CONFIRM';
  const canExport = status === 'FINISHED';
  const showIndividualTab = Boolean(
    hackathon?.individual_ranking_enabled ?? hackathon?.individualRankingEnabled
  ) && status === 'FINISHED';

  return {
    loading,
    hackathon,
    teamRankings,
    chapterRankings,
    individualRankings,
    prizes,
    closing,
    exporting,
    canAwardPrize,
    canConfirm,
    canRevokePrize,
    canExport,
    showIndividualTab,
    refresh: fetchData,
    handleConfirmClosure,
    handleExportRankings,
    handleRevokePrize,
  };
}
