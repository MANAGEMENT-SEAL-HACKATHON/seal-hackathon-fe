import { useState, useEffect, useCallback } from 'react';
import { message, notification } from 'antd';
import dayjs from 'dayjs';
import { eventService } from '../services/eventService';
import { hackathonService } from '../../hackathons/services/hackathonService';
import { roundService } from '../../rounds/services/roundService';
import { mapEventToFE, mapEventToBE } from '../mappers/eventMapper';
import { mapHackathonToFE } from '../../hackathons/mappers/hackathonMapper';
import { getTeamErrorMessage } from '../../../shared/constants/teamErrors';
import { EVENT_TYPE_LABELS, UNIQUE_EVENT_TYPES } from '../utils/eventTypeRules';
import { getAwardsMinMoment, buildEventScheduleContext } from '../utils/eventScheduleRules';

export const useEventManagement = (hackathonId, refreshNotifications, onUpdated) => {
  const [events, setEvents] = useState([]);
  const [rounds, setRounds] = useState([]);
  const [currentHackathon, setCurrentHackathon] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [hRes, eRes, rRes] = await Promise.all([
        hackathonService.getById(hackathonId),
        eventService.listByHackathon(hackathonId),
        roundService.listByHackathon(hackathonId)
      ]);
      
      setCurrentHackathon(mapHackathonToFE(hRes));
      
      const eventList = Array.isArray(eRes) ? eRes : (eRes?.items || eRes?.content || []);
      setEvents(eventList.map(mapEventToFE));

      const roundList = Array.isArray(rRes) ? rRes : (rRes?.items || rRes?.content || []);
      setRounds(roundList);
    } catch (error) {
      message.error('Lỗi tải dữ liệu từ Server');
    } finally {
      setIsLoading(false);
    }
  }, [hackathonId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const createEvent = async (values, onSuccess) => {
    const eStart = dayjs(values.starts_at);
    const eEnd = values.ends_at ? dayjs(values.ends_at) : null;
    
    const hRegEnd = currentHackathon?.registration_end ? dayjs(currentHackathon.registration_end) : null;
    const hEvEnd = currentHackathon?.event_end ? dayjs(currentHackathon.event_end).endOf('day') : null;

    // Tìm mốc "Ngày thi Hackathon" (exam_at của vòng thi sớm nhất)
    const firstRound = rounds && rounds.length > 0 
      ? [...rounds].sort((a, b) => dayjs(a.exam_at || a.examAt).valueOf() - dayjs(b.exam_at || b.examAt).valueOf())[0] 
      : null;
    const firstExamDate = firstRound && (firstRound.exam_at || firstRound.examAt) 
      ? dayjs(firstRound.exam_at || firstRound.examAt).startOf('day') 
      : (currentHackathon?.event_start ? dayjs(currentHackathon.event_start).startOf('day') : null);

    const dateFormat = 'HH:mm DD/MM/YYYY';

    // --- 1. Mỗi kỳ chỉ 1 Khai mạc / Workshop / Trao giải ---
    if (UNIQUE_EVENT_TYPES.includes(values.type) && events.some((e) => e.type === values.type)) {
      const label = EVENT_TYPE_LABELS[values.type] || values.type;
      return message.error(`Kỳ thi này đã có ${label}. Mỗi loại chỉ tạo một lần.`);
    }

    if (!events.length && values.type !== 'KICKOFF') {
      return message.error('Sự kiện đầu tiên phải là Lễ khai mạc.');
    }

    // --- 2. QUY TẮC: WORKSHOP ---
    if (values.type === 'WORKSHOP') {
      if (hRegEnd && eStart.isBefore(hRegEnd)) {
        return message.error(`Workshop phải diễn ra sau khi kết thúc đăng ký tham gia (Sau ${hRegEnd.format(dateFormat)}).`);
      }
      
      const kickoffEvent = events.find(e => e.type === 'KICKOFF');
      if (kickoffEvent) {
        const kickoffDay = dayjs(kickoffEvent.starts_at).startOf('day');
        if (!eStart.isBefore(kickoffDay)) {
          return message.error(`Workshop phải diễn ra trước sự kiện Khai mạc ít nhất 1 ngày (Trước ngày ${kickoffDay.format('DD/MM/YYYY')}).`);
        }
      }
    }

    // --- 3. QUY TẮC: KICK-OFF ---
    if (values.type === 'KICKOFF') {
      const workshopEvents = events.filter(e => e.type === 'WORKSHOP');
      if (workshopEvents.length > 0) {
        const latestWorkshop = workshopEvents.sort((a, b) => dayjs(b.ends_at || b.starts_at).diff(dayjs(a.ends_at || a.starts_at)))[0];
        const workshopEndDay = dayjs(latestWorkshop.ends_at || latestWorkshop.starts_at).startOf('day');
        if (!eStart.isAfter(workshopEndDay, 'day')) {
          return message.error(`Sự kiện Khai mạc phải diễn ra sau Workshop ít nhất 1 ngày (Từ ngày ${workshopEndDay.add(1, 'day').format('DD/MM/YYYY')} trở đi).`);
        }
      }

      if (firstExamDate) {
        // Khai mạc bắt buộc phải đúng 1 ngày trước ngày thi
        const requiredKickoffDate = firstExamDate.subtract(1, 'day').startOf('day');
        if (!eStart.startOf('day').isSame(requiredKickoffDate)) {
          return message.error(`Sự kiện Khai mạc (Kick-off) bắt buộc phải diễn ra đúng 1 ngày trước ngày thi chính thức của Hackathon (Bắt buộc phải là ngày ${requiredKickoffDate.format('DD/MM/YYYY')}).`);
        }
      }

      const buffetStart = values.buffet_starts_at ? dayjs(values.buffet_starts_at) : null;
      const buffetEnd = values.buffet_ends_at ? dayjs(values.buffet_ends_at) : null;
      if (buffetStart || buffetEnd || values.buffet_location) {
        if (buffetStart && buffetStart.isBefore(eStart)) {
          return message.error('Giờ bắt đầu buffet phải trong khung sự kiện Khai mạc.');
        }
        if (buffetEnd && eEnd && buffetEnd.isAfter(eEnd)) {
          return message.error('Giờ kết thúc buffet phải trong khung sự kiện Khai mạc.');
        }
        if (buffetStart && buffetEnd && buffetEnd.isBefore(buffetStart)) {
          return message.error('Giờ kết thúc buffet phải sau giờ bắt đầu buffet.');
        }
      }
    }

    // --- 4. QUY TẮC: AWARDS ---
    if (values.type === 'AWARDS') {
      const scheduleCtx = buildEventScheduleContext({
        hackathon: currentHackathon,
        rounds,
        events,
        selectedType: 'AWARDS',
      });
      const minMoment = getAwardsMinMoment(scheduleCtx);
      if (minMoment && eStart.isBefore(minMoment)) {
        return message.error(
          `Lễ Trao giải phải diễn ra sau khi vòng Chung kết công bố kết quả (Sau ${minMoment.format(dateFormat)}).`,
        );
      }

      if (hEvEnd && (eStart.isAfter(hEvEnd) || (eEnd && eEnd.isAfter(hEvEnd)))) {
        return message.error(`Lễ Trao giải không được tổ chức muộn hơn ngày bế mạc Hackathon (Ngày ${hEvEnd.format('DD/MM/YYYY')}).`);
      }
    }

    // Hàm thực thi gọi API
    const executeSave = async () => {
      setIsLoading(true);
      try {
        const payload = mapEventToBE(values);
        await eventService.create(hackathonId, payload);
        message.success('Đã tạo sự kiện thành công!');

        if (typeof refreshNotifications === 'function') {
          await refreshNotifications();
        }
        notification.info({
          message: 'Đã lên lịch nhắc nhở',
          description: `Sự kiện ${values.title} đã được thêm vào lịch trình.`,
          placement: 'bottomRight',
        });

        fetchData();
        if (typeof onUpdated === 'function') {
          await onUpdated();
        }
        if (onSuccess) onSuccess();
      } catch (error) {
        message.error(getTeamErrorMessage(error) || 'Có lỗi xảy ra khi tạo sự kiện. Vui lòng thử lại.');
      } finally {
        setIsLoading(false);
      }
    };

    executeSave();
  };

  const updateEvent = async (eventId, values, onSuccess) => {
    const existing = events.find((e) => e.id === eventId);
    if (!existing) {
      return message.error('Không tìm thấy sự kiện');
    }
    const merged = { ...existing, ...values, type: existing.type };
    setIsLoading(true);
    try {
      const payload = mapEventToBE(merged);
      await eventService.update(eventId, payload);
      message.success('Đã cập nhật sự kiện');
      await fetchData();
      if (typeof onUpdated === 'function') await onUpdated();
      if (onSuccess) onSuccess();
    } catch (error) {
      message.error(getTeamErrorMessage(error) || 'Có lỗi xảy ra khi cập nhật sự kiện.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- LOGIC XÓA CÓ RÀNG BUỘC KÉP ---
  const deleteEvent = async (eventId) => {
    const eventToDelete = events.find(e => e.id === eventId);
    
    // Nếu xóa Khai mạc, phải kiểm tra xem có Workshop không
    if (eventToDelete && eventToDelete.type === 'KICKOFF') {
      const hasWorkshop = events.some(e => e.type === 'WORKSHOP');
      if (hasWorkshop) {
        return message.error('Lỗi: Bạn phải xóa sự kiện Workshop trước! Vì Khai mạc đang là mốc thời gian để giới hạn cho Workshop.');
      }
    }

    setIsLoading(true);
    try {
      await eventService.delete(eventId);
      message.success('Đã xóa sự kiện thành công');
      fetchData();
      if (typeof onUpdated === 'function') {
        await onUpdated();
      }
    } catch (error) {
      message.error(error.message || 'Lỗi khi xóa sự kiện');
    } finally {
      setIsLoading(false);
    }
  };

  return { events, rounds, currentHackathon, isLoading, createEvent, updateEvent, deleteEvent };
};