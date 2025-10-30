import React, { useState, useEffect } from 'react';
import { Layout, Button, Empty, message, Modal, Spin } from 'antd';
import { PlusOutlined, AppstoreOutlined } from '@ant-design/icons';
import GridLayout, { Layout as GridLayoutType } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import {
  getAllCards,
  updateCard,
  deleteCard,
  type VisualizationCard,
  type CardPosition,
} from '../services/visualization.service';
import CardConfigModal from '../components/visualization/CardConfigModal';
import DataStatisticCard from '../components/visualization/DataStatisticCard';
import ChartCard from '../components/visualization/ChartCard';

const { Content } = Layout;

/**
 * 数据可视化 Dashboard 页面
 *
 * 功能：
 * - 展示用户创建的所有可视化卡片
 * - 支持拖拽调整卡片位置和大小
 * - 拖拽后自动保存布局配置
 * - 支持添加、编辑、删除卡片
 */
const VisualizationDashboardPage: React.FC = () => {
  const [cards, setCards] = useState<VisualizationCard[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [editingCard, setEditingCard] = useState<VisualizationCard | null>(null);

  // 加载卡片配置列表
  useEffect(() => {
    loadCards();
  }, []);

  /**
   * 从服务器加载卡片配置列表
   */
  const loadCards = async () => {
    try {
      setLoading(true);
      const loadedCards = await getAllCards();
      setCards(loadedCards);
    } catch (error) {
      console.error('Failed to load cards:', error);
      message.error('加载卡片配置失败');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 处理布局变化事件（拖拽/调整大小）
   * @param newLayout - 新的布局配置
   */
  const handleLayoutChange = async (newLayout: GridLayoutType[]) => {
    // 防止初始化时的布局变化触发保存
    if (cards.length === 0 || saving) {
      return;
    }

    try {
      setSaving(true);

      // 批量更新卡片position
      const updatePromises = newLayout.map((layoutItem) => {
        const card = cards.find((c) => c.id === layoutItem.i);
        if (!card) return Promise.resolve();

        const newPosition: CardPosition = {
          x: layoutItem.x,
          y: layoutItem.y,
          w: layoutItem.w,
          h: layoutItem.h,
        };

        // 只有position变化时才更新
        if (
          card.position.x !== newPosition.x ||
          card.position.y !== newPosition.y ||
          card.position.w !== newPosition.w ||
          card.position.h !== newPosition.h
        ) {
          return updateCard(card.id, { position: newPosition });
        }

        return Promise.resolve();
      });

      await Promise.all(updatePromises);

      // 更新本地状态
      setCards((prevCards) =>
        prevCards.map((card) => {
          const layoutItem = newLayout.find((item) => item.i === card.id);
          if (!layoutItem) return card;

          return {
            ...card,
            position: {
              x: layoutItem.x,
              y: layoutItem.y,
              w: layoutItem.w,
              h: layoutItem.h,
            },
          };
        })
      );

      message.success('布局已保存');
    } catch (error) {
      console.error('Failed to save layout:', error);
      message.error('保存布局失败');
    } finally {
      setSaving(false);
    }
  };

  /**
   * 处理添加卡片按钮点击
   */
  const handleAddCard = () => {
    setEditingCard(null);
    setModalVisible(true);
  };

  /**
   * 处理编辑卡片
   */
  const handleEditCard = (card: VisualizationCard) => {
    setEditingCard(card);
    setModalVisible(true);
  };

  /**
   * 处理 Modal 保存成功
   */
  const handleModalOk = () => {
    setModalVisible(false);
    setEditingCard(null);
    loadCards(); // 重新加载卡片列表
  };

  /**
   * 处理 Modal 取消
   */
  const handleModalCancel = () => {
    setModalVisible(false);
    setEditingCard(null);
  };

  /**
   * 处理删除卡片
   */
  const handleDeleteCard = (cardId: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个卡片吗?删除后无法恢复。',
      okText: '确认',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteCard(cardId);
          setCards((prevCards) => prevCards.filter((card) => card.id !== cardId));
          message.success('卡片已删除');
        } catch (error) {
          console.error('Failed to delete card:', error);
          message.error('删除卡片失败');
        }
      },
    });
  };

  /**
   * 将卡片配置转换为 GridLayout 的布局配置
   */
  const convertCardsToLayout = (): GridLayoutType[] => {
    return cards.map((card) => ({
      i: card.id,
      x: card.position.x,
      y: card.position.y,
      w: card.position.w,
      h: card.position.h,
      minW: 2,
      minH: 2,
    }));
  };

  /**
   * 根据卡片类型渲染对应的卡片组件
   */
  const renderCard = (card: VisualizationCard) => {
    const commonProps = {
      card,
      onEdit: () => handleEditCard(card),
      onDelete: () => handleDeleteCard(card.id),
    };

    switch (card.cardType) {
      case 'chart':
        return <ChartCard {...commonProps} />;
      case 'statistic':
        return <DataStatisticCard {...commonProps} />;
      case 'gauge':
      case 'status':
        // 这些类型暂未实现，使用数值卡片作为占位符
        return <DataStatisticCard {...commonProps} />;
      default:
        return <DataStatisticCard {...commonProps} />;
    }
  };

  if (loading) {
    return (
      <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
        <Content
          style={{
            padding: '24px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Spin size="large" tip="加载中..." />
        </Content>
      </Layout>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      <Content style={{ padding: '24px' }}>
        {/* 页面头部 */}
        <div
          style={{
            marginBottom: '24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <AppstoreOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>数据可视化 Dashboard</h1>
          </div>
          <Button type="primary" icon={<PlusOutlined />} size="large" onClick={handleAddCard}>
            添加卡片
          </Button>
        </div>

        {/* 卡片网格布局 */}
        {cards.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <span>
                暂无可视化卡片
                <br />
                点击"添加卡片"按钮开始创建您的数据监控大屏
              </span>
            }
            style={{
              marginTop: '100px',
              padding: '40px',
              background: '#fff',
              borderRadius: '8px',
            }}
          >
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddCard}>
              添加卡片
            </Button>
          </Empty>
        ) : (
          <GridLayout
            className="layout"
            layout={convertCardsToLayout()}
            cols={12}
            rowHeight={80}
            width={1200}
            onLayoutChange={handleLayoutChange}
            draggableHandle=".drag-handle"
            compactType="vertical"
            preventCollision={false}
          >
            {cards.map((card) => (
              <div key={card.id}>{renderCard(card)}</div>
            ))}
          </GridLayout>
        )}

        {/* 卡片配置弹窗 */}
        <CardConfigModal
          visible={modalVisible}
          card={editingCard}
          onOk={handleModalOk}
          onCancel={handleModalCancel}
        />
      </Content>
    </Layout>
  );
};

export default VisualizationDashboardPage;
