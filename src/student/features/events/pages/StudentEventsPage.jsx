import { useEffect, useState } from 'react';
import { Alert, Card, Empty, List, Spin, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import { CalendarDays } from 'lucide-react';
import { eventService } from '../../../../features/events/services/eventService';
import { EVENT_TYPE_LABELS } from '../../../../features/events/utils/eventTypeRules';
import { studentHackathonService } from '../../hackathon/services/studentHackathon.service';

const { Title, Text } = Typography;

const StudentEventsPage = () => {
  const [loading, setLoading] = useState(true);
  const [hackathon, setHackathon] = useState(null);
  const [events, setEvents] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const primary = await studentHackathonService.getPrimaryRegisteredHackathon();
        if (!primary?.id) {
          if (!cancelled) {
            setHackathon(null);
            setEvents([]);
          }
          return;
        }
        if (!cancelled) setHackathon(primary);
        const res = await eventService.listByHackathon(primary.id, { isPublic: true });
        const list = Array.isArray(res) ? res : (res?.items || []);
        const withMenus = await Promise.all(
          list.map(async (item) => {
            if (item.type !== 'BUFFET' || !item.id) return item;
            try {
              const menu = await eventService.getBuffetMenu(item.id);
              return { ...item, buffetMenu: Array.isArray(menu) ? menu : [] };
            } catch {
              return { ...item, buffetMenu: [] };
            }
          }),
        );
        if (!cancelled) setEvents(withMenus);
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || 'Không tải được lịch sự kiện.');
          setEvents([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <CalendarDays size={28} />
        <div>
          <Title level={3} style={{ margin: 0 }}>Lịch sự kiện</Title>
          <Text type="secondary">
            {hackathon?.name ? `Sự kiện: ${hackathon.name}` : 'Các sự kiện công khai của hackathon bạn đã đăng ký'}
          </Text>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 64 }}><Spin size="large" /></div>
      ) : error ? (
        <Alert type="error" showIcon message="Không tải được dữ liệu" description={error} />
      ) : !hackathon ? (
        <Empty description="Chọn/đăng ký sự kiện để xem lịch" />
      ) : events.length === 0 ? (
        <Empty description="Chưa có sự kiện nào được công bố" />
      ) : (
        <Card>
          <List
            dataSource={events}
            renderItem={(item) => {
              const typeLabel = EVENT_TYPE_LABELS[item.type] || item.type;
              const start = item.startsAt || item.startAt || item.startTime;
              const end = item.endsAt || item.endAt || item.endTime;
              const menu = item.buffetMenu || [];
              return (
                <List.Item>
                  <List.Item.Meta
                    title={
                      <span>
                        {item.title || item.name || `Sự kiện #${item.id}`}
                        {item.type ? <Tag style={{ marginLeft: 8 }}>{typeLabel}</Tag> : null}
                      </span>
                    }
                    description={
                      <span>
                        {start
                          ? dayjs(start).format('HH:mm DD/MM/YYYY')
                          : 'Chưa có thời gian'}
                        {end ? ` — ${dayjs(end).format('HH:mm DD/MM/YYYY')}` : ''}
                        {item.location ? ` · ${item.location}` : ''}
                        {item.type === 'BUFFET' && menu.length > 0 ? (
                          <>
                            <br />
                            <Text type="secondary">Thực đơn: </Text>
                            {menu.map((dish, idx) => (
                              <span key={dish.id || idx}>
                                {idx > 0 ? '; ' : ''}
                                {dish.name}
                                {dish.quantity != null ? ` ×${dish.quantity}` : ''}
                                {dish.unit ? ` ${dish.unit}` : ''}
                                {dish.note ? ` (${dish.note})` : ''}
                              </span>
                            ))}
                          </>
                        ) : null}
                      </span>
                    }
                  />
                </List.Item>
              );
            }}
          />
        </Card>
      )}
    </div>
  );
};

export default StudentEventsPage;
