import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Row, Col, Typography, Button, Spin, message } from 'antd';
import { ArrowLeft } from 'lucide-react';
import { studentResultsService } from '../services/studentResults.service';
import StudentFinalLeaderboard from '../components/StudentFinalLeaderboard';
import MyHonorsPanel from '../components/MyHonorsPanel';

const { Title, Text } = Typography;

const StudentHackathonResultsPage = () => {
  const { hackathonId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  const [teamRankings, setTeamRankings] = useState([]);
  const [prizes, setPrizes] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);
      try {
        const [rankingsRes, prizesRes, certsRes] = await Promise.all([
          studentResultsService.getHackathonRankings(hackathonId),
          studentResultsService.getMyPrizes(),
          studentResultsService.getMyCertificates()
        ]);

        setTeamRankings(rankingsRes);
        setPrizes(prizesRes.filter(p => p.hackathonId === parseInt(hackathonId))); // Filter prizes by this hackathon
        setCertificates(certsRes.filter(c => c.hackathonId === parseInt(hackathonId)));

      } catch (error) {
        if (error.response?.data?.code === 'RESULT_NOT_AVAILABLE' || error.response?.status === 422) {
          setErrorMsg("Kết quả chung cuộc đang được tổng hợp. Vui lòng quay lại sau khi Ban tổ chức công bố giải thưởng.");
        } else {
          setErrorMsg("Không thể tải kết quả chung cuộc. Có thể cuộc thi chưa kết thúc.");
        }
      } finally {
        setLoading(false);
      }
    };

    if (hackathonId) {
      fetchResults();
    }
  }, [hackathonId]);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 40 }}>
      <Button 
        type="text" 
        icon={<ArrowLeft size={16} />} 
        onClick={() => navigate('/student/results')}
        style={{ color: '#595959', marginBottom: 16, padding: 0 }}
      >
        Quay lại tìm kiếm
      </Button>

      <div style={{ marginBottom: 32 }}>
        <Title level={2} style={{ color: '#1f1f1f', margin: 0, fontWeight: 700 }}>Vinh danh Chung cuộc</Title>
        <Text style={{ color: '#595959', fontSize: 16 }}>
          Hackathon ID: {hackathonId} — Bảng xếp hạng toàn đoàn và giải thưởng cá nhân xuất sắc.
        </Text>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '100px 0' }}>
          <Spin size="large" />
        </div>
      ) : errorMsg ? (
        <div style={{ maxWidth: 800, margin: '40px auto' }}>
          <Alert
            type="info"
            showIcon
            message={<span style={{ fontWeight: 600, fontSize: 16 }}>Chưa có kết quả</span>}
            description={errorMsg}
            style={{ padding: '20px 24px', borderRadius: 12, background: '#e6f4ff', border: '1px solid #91caff' }}
          />
        </div>
      ) : (
        <Row gutter={[24, 24]}>
          {/* Cột trái: Vinh danh & Giải thưởng */}
          <Col xs={24} lg={8}>
            <MyHonorsPanel 
              prizes={prizes} 
              certificates={certificates} 
              loading={loading} 
            />
          </Col>

          {/* Cột phải: Bảng xếp hạng */}
          <Col xs={24} lg={16}>
            <StudentFinalLeaderboard 
              data={teamRankings} 
              loading={loading} 
            />
          </Col>
        </Row>
      )}
    </div>
  );
};

export default StudentHackathonResultsPage;
