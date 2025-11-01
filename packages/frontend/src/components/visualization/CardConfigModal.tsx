import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  message,
  AutoComplete,
  Radio,
  DatePicker,
  Button,
  Divider,
} from 'antd';
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  createCard,
  updateCard,
  getDeviceDataKeys,
  type VisualizationCard,
  type CreateCardDto,
  type DataKey,
} from '@/services/visualization.service';
import { getEndpoints } from '@/services/endpoint.service';
import { getEndpointDevices } from '@/services/device.service';
import type { EndpointWithUrl, Device } from '@websocket-relay/shared';

const { Option } = Select;

interface CardConfigModalProps {
  visible: boolean;
  card?: VisualizationCard | null; // 编辑时传入现有卡片
  onOk: () => void; // 成功后的回调
  onCancel: () => void;
}

/**
 * 卡片配置弹窗组件
 *
 * 功能：
 * - 创建新卡片配置
 * - 编辑现有卡片配置
 * - 动态加载端点、设备、数据字段列表
 * - 表单验证和提交
 */
const CardConfigModal: React.FC<CardConfigModalProps> = ({ visible, card, onOk, onCancel }) => {
  const [form] = Form.useForm<CreateCardDto>();
  const [loading, setLoading] = useState<boolean>(false);
  const [endpoints, setEndpoints] = useState<EndpointWithUrl[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [dataKeys, setDataKeys] = useState<DataKey[]>([]);
  const [loadingDevices, setLoadingDevices] = useState<boolean>(false);
  const [cardType, setCardType] = useState<string>('statistic');

  // 组件挂载时加载端点列表
  useEffect(() => {
    if (visible) {
      loadEndpoints();

      // 如果是编辑模式，填充表单
      if (card) {
        setCardType(card.cardType);

        // 处理配置对象，转换时间范围格式
        const config = typeof card.config === 'string' ? JSON.parse(card.config) : card.config;
        let formConfig = { ...config };

        // 如果是图表类型且有自定义时间范围，需要转换为 Dayjs 数组
        if (
          card.cardType === 'chart' &&
          config.timeRange?.type === 'custom' &&
          config.timeRange.custom
        ) {
          formConfig = {
            ...config,
            timeRange: {
              type: 'custom',
              custom: [
                dayjs(config.timeRange.custom.startTime),
                dayjs(config.timeRange.custom.endTime),
              ],
            },
          };
        }

        form.setFieldsValue({
          cardType: card.cardType,
          endpointId: card.endpointId,
          deviceId: card.deviceId,
          dataKey: card.dataKey,
          title: card.title,
          config: formConfig,
        });

        // 加载设备和数据字段
        if (card.endpointId) {
          loadDevices(card.endpointId);
        }
        if (card.endpointId && card.deviceId) {
          loadDataKeys(card.endpointId, card.deviceId);
        }
      } else {
        // 创建模式，设置默认位置
        setCardType('statistic');
        form.setFieldsValue({
          cardType: 'statistic',
          position: { x: 0, y: 0, w: 3, h: 2 },
          config: {
            precision: 1,
            refreshInterval: 5000,
          },
        });
      }
    } else {
      // 关闭时重置表单
      form.resetFields();
      setDevices([]);
      setDataKeys([]);
    }
  }, [visible, card, form]);

  /**
   * 加载端点列表
   */
  const loadEndpoints = async () => {
    try {
      const loadedEndpoints = await getEndpoints();
      setEndpoints(loadedEndpoints);
    } catch (error) {
      console.error('Failed to load endpoints:', error);
      message.error('加载端点列表失败');
    }
  };

  /**
   * 端点选择变化时加载设备列表
   * CRITICAL: 图表类型也需要加载设备列表,因为数据源配置需要选择设备
   */
  const handleEndpointChange = async (endpointId: string) => {
    // 清空设备和数据字段
    form.setFieldsValue({ deviceId: undefined, dataKey: undefined });
    setDevices([]);
    setDataKeys([]);

    // 所有卡片类型都需要加载设备列表(图表类型在数据源配置中需要)
    await loadDevices(endpointId);
  };

  /**
   * 加载设备列表
   */
  const loadDevices = async (endpointId: string) => {
    try {
      setLoadingDevices(true);
      const response = await getEndpointDevices(endpointId);
      setDevices(response.devices);
    } catch (error) {
      console.error('Failed to load devices:', error);
      message.error('加载设备列表失败');
    } finally {
      setLoadingDevices(false);
    }
  };

  /**
   * 设备选择变化时加载数据字段列表
   */
  const handleDeviceChange = async (deviceId: string) => {
    // 清空数据字段
    form.setFieldsValue({ dataKey: undefined });
    setDataKeys([]);

    const endpointId = form.getFieldValue('endpointId');
    if (!endpointId) {
      message.error('请先选择端点');
      return;
    }

    await loadDataKeys(endpointId, deviceId);
  };

  /**
   * 加载数据字段列表
   */
  const loadDataKeys = async (endpointId: string, deviceId: string) => {
    try {
      const response = await getDeviceDataKeys(endpointId, deviceId);
      setDataKeys(response.dataKeys);

      if (response.dataKeys.length === 0) {
        message.info('该设备暂无数据字段，您可以手动输入字段名称，创建卡片后等待设备上报数据', 5);
      }
    } catch (error) {
      console.error('Failed to load data keys:', error);
      message.error('加载数据字段失败');
    }
  };

  /**
   * 表单提交
   */
  const handleSubmit = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();

      // 构建配置对象
      const config: any = {
        unit: values.config?.unit,
        color: values.config?.color,
        precision: values.config?.precision,
        threshold: values.config?.threshold,
        refreshInterval: values.config?.refreshInterval,
      };

      // 如果是图表类型，添加图表特定配置
      if (values.cardType === 'chart') {
        config.chartType = values.config?.chartType;
        config.dataSources = values.config?.dataSources;
        config.aggregation = values.config?.aggregation;
        config.maxDataPoints = values.config?.maxDataPoints;

        // 处理时间范围配置（需要转换 DatePicker.RangePicker 的值）
        if (values.config?.timeRange) {
          const timeRange = values.config.timeRange;
          if (timeRange.type === 'custom' && timeRange.custom && Array.isArray(timeRange.custom)) {
            // DatePicker.RangePicker 返回的是 [Dayjs, Dayjs]，需要转换为字符串
            config.timeRange = {
              type: 'custom',
              custom: {
                startTime: timeRange.custom[0].toISOString(),
                endTime: timeRange.custom[1].toISOString(),
              },
            };
          } else {
            config.timeRange = timeRange;
          }
        }
      }

      // 如果是编辑模式，使用现有位置；否则使用默认位置
      const cardData: CreateCardDto = {
        ...values,
        position: card?.position || { x: 0, y: 0, w: 6, h: 4 }, // 图表卡片默认更大
        config,
      };

      if (card) {
        // 编辑模式
        await updateCard(card.id, cardData);
        message.success('卡片配置已更新');
      } else {
        // 创建模式
        await createCard(cardData);
        message.success('卡片配置已创建');
      }

      form.resetFields();
      onOk();
    } catch (error) {
      if (error instanceof Error && 'errorFields' in error) {
        // 表单验证错误，不显示消息
        return;
      }
      console.error('Failed to save card:', error);
      message.error(card ? '更新卡片配置失败' : '创建卡片配置失败');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 取消
   */
  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  return (
    <Modal
      title={card ? '编辑卡片' : '添加卡片'}
      open={visible}
      onOk={handleSubmit}
      onCancel={handleCancel}
      confirmLoading={loading}
      width={600}
      okText="保存"
      cancelText="取消"
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          cardType: 'statistic',
          config: {
            precision: 1,
          },
        }}
      >
        <Form.Item
          name="cardType"
          label="卡片类型"
          rules={[{ required: true, message: '请选择卡片类型' }]}
        >
          <Select
            placeholder="选择卡片类型"
            onChange={(value) => {
              setCardType(value);
              // 切换卡片类型时，重置部分表单字段
              if (value === 'chart') {
                form.setFieldsValue({
                  deviceId: undefined,
                  dataKey: undefined,
                  config: {
                    chartType: 'line',
                    timeRange: {
                      type: 'quick',
                      quick: '24h',
                    },
                    dataSources: [],
                    maxDataPoints: 1000,
                    refreshInterval: 5000,
                  },
                });
              } else {
                form.setFieldsValue({
                  config: {
                    precision: 1,
                    refreshInterval: 5000,
                  },
                });
              }
            }}
          >
            <Option value="statistic">数值卡片</Option>
            <Option value="gauge">仪表盘</Option>
            <Option value="chart">图表</Option>
            <Option value="status">状态指示器</Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="endpointId"
          label="选择端点"
          rules={[{ required: true, message: '请选择端点' }]}
        >
          <Select
            placeholder="选择端点"
            onChange={handleEndpointChange}
            showSearch
            optionFilterProp="children"
          >
            {endpoints.map((e) => (
              <Option key={e.id} value={e.id}>
                {e.name}
              </Option>
            ))}
          </Select>
        </Form.Item>

        {/* 非图表类型才需要选择设备和数据字段 */}
        {cardType !== 'chart' && (
          <>
            <Form.Item
              name="deviceId"
              label="选择设备"
              rules={[{ required: true, message: '请选择设备' }]}
            >
              <Select
                placeholder="选择设备"
                onChange={handleDeviceChange}
                loading={loadingDevices}
                disabled={devices.length === 0}
                showSearch
                optionFilterProp="children"
              >
                {devices.map((d) => (
                  <Option key={d.id} value={d.id}>
                    {d.custom_name || d.device_id}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="dataKey"
              label="数据字段"
              rules={[{ required: true, message: '请输入或选择数据字段' }]}
              tooltip="设备还未上报数据时，可以手动输入字段名（如：temperature），创建卡片后等待设备上报数据"
            >
              <AutoComplete
                placeholder={
                  dataKeys.length > 0 ? '选择或输入数据字段' : '输入数据字段名称（如：temperature）'
                }
                options={dataKeys.map((k) => ({
                  value: k.key,
                  label: `${k.key} ${k.unit ? `(${k.unit})` : ''}`,
                }))}
                filterOption={(inputValue, option) =>
                  option?.value.toLowerCase().indexOf(inputValue.toLowerCase()) !== -1
                }
              />
            </Form.Item>
          </>
        )}

        <Form.Item
          name="title"
          label="卡片标题"
          rules={[{ required: true, message: '请输入卡片标题' }]}
        >
          <Input placeholder="如：温度监控" />
        </Form.Item>

        {/* 图表类型专属配置 */}
        {cardType === 'chart' && (
          <>
            <Divider>图表配置</Divider>

            <Form.Item
              name={['config', 'chartType']}
              label="图表类型"
              rules={[{ required: true, message: '请选择图表类型' }]}
            >
              <Select placeholder="选择图表类型">
                <Option value="line">折线图</Option>
                <Option value="bar">柱状图</Option>
              </Select>
            </Form.Item>

            <Form.Item
              name={['config', 'timeRange', 'type']}
              label="时间范围类型"
              rules={[{ required: true, message: '请选择时间范围类型' }]}
            >
              <Radio.Group>
                <Radio value="quick">快捷选项</Radio>
                <Radio value="custom">自定义</Radio>
              </Radio.Group>
            </Form.Item>

            <Form.Item noStyle dependencies={[['config', 'timeRange', 'type']]}>
              {({ getFieldValue }) =>
                getFieldValue(['config', 'timeRange', 'type']) === 'quick' ? (
                  <Form.Item
                    name={['config', 'timeRange', 'quick']}
                    label="快捷时间范围"
                    rules={[{ required: true, message: '请选择时间范围' }]}
                  >
                    <Select placeholder="选择时间范围">
                      <Option value="1h">最近1小时</Option>
                      <Option value="24h">最近24小时</Option>
                      <Option value="7d">最近7天</Option>
                    </Select>
                  </Form.Item>
                ) : null
              }
            </Form.Item>

            <Form.Item noStyle dependencies={[['config', 'timeRange', 'type']]}>
              {({ getFieldValue }) =>
                getFieldValue(['config', 'timeRange', 'type']) === 'custom' ? (
                  <Form.Item
                    name={['config', 'timeRange', 'custom']}
                    label="自定义时间范围"
                    rules={[{ required: true, message: '请选择时间范围' }]}
                  >
                    <DatePicker.RangePicker showTime style={{ width: '100%' }} />
                  </Form.Item>
                ) : null
              }
            </Form.Item>

            {/* 多设备数据源配置 */}
            <Form.List
              name={['config', 'dataSources']}
              rules={[
                {
                  validator: async (_, dataSources) => {
                    if (!dataSources || dataSources.length === 0) {
                      return Promise.reject(new Error('请至少添加一个数据源'));
                    }
                  },
                },
              ]}
            >
              {(fields, { add, remove }, { errors }) => (
                <>
                  <Form.Item
                    label="数据源配置"
                    tooltip="选择设备后,可以查看该设备的数据字段列表,或手动输入字段名"
                  >
                    {fields.map((field) => (
                      <div
                        key={field.key}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '2fr 1.2fr 1.5fr 120px auto',
                          gap: '8px',
                          marginBottom: 8,
                          alignItems: 'start',
                        }}
                      >
                        <Form.Item
                          {...field}
                          name={[field.name, 'deviceId']}
                          rules={[{ required: true, message: '请选择设备' }]}
                          style={{ marginBottom: 0 }}
                        >
                          <Select
                            placeholder="选择设备"
                            loading={loadingDevices}
                            disabled={devices.length === 0}
                            showSearch
                            optionFilterProp="children"
                            onChange={async (deviceId: string) => {
                              // 当选择设备时,加载该设备的数据字段列表
                              const endpointId = form.getFieldValue('endpointId');
                              if (endpointId && deviceId) {
                                try {
                                  const response = await getDeviceDataKeys(endpointId, deviceId);
                                  setDataKeys(response.dataKeys);
                                  if (response.dataKeys.length === 0) {
                                    message.info('该设备暂无数据字段,请手动输入字段名称', 3);
                                  }
                                } catch (error) {
                                  console.error('Failed to load data keys:', error);
                                }
                              }
                            }}
                          >
                            {devices.map((d) => (
                              <Option key={d.id} value={d.id}>
                                {d.custom_name || d.device_id}
                              </Option>
                            ))}
                          </Select>
                        </Form.Item>

                        <Form.Item
                          {...field}
                          name={[field.name, 'dataKey']}
                          rules={[{ required: true, message: '请输入数据字段' }]}
                          style={{ marginBottom: 0 }}
                        >
                          <AutoComplete
                            placeholder="数据字段"
                            options={dataKeys.map((k) => ({
                              value: k.key,
                              label: `${k.key} ${k.unit ? `(${k.unit})` : ''}`,
                            }))}
                            filterOption={(inputValue, option) =>
                              option?.value.toLowerCase().indexOf(inputValue.toLowerCase()) !== -1
                            }
                          />
                        </Form.Item>

                        <Form.Item
                          {...field}
                          name={[field.name, 'label']}
                          rules={[{ required: true, message: '请输入曲线标签' }]}
                          style={{ marginBottom: 0 }}
                        >
                          <Input placeholder="曲线标签" />
                        </Form.Item>

                        <Form.Item
                          {...field}
                          name={[field.name, 'color']}
                          style={{ marginBottom: 0 }}
                        >
                          <Input placeholder="#1890ff" />
                        </Form.Item>

                        <MinusCircleOutlined
                          onClick={() => remove(field.name)}
                          style={{
                            fontSize: '18px',
                            color: '#ff4d4f',
                            cursor: 'pointer',
                            marginTop: '8px',
                          }}
                        />
                      </div>
                    ))}
                    <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                      添加数据源
                    </Button>
                  </Form.Item>
                  <Form.ErrorList errors={errors} />
                </>
              )}
            </Form.List>

            <Form.Item name={['config', 'aggregation']} label="数据聚合粒度">
              <Select placeholder="自动决策（可选）" allowClear>
                <Option value="minute">按分钟</Option>
                <Option value="hour">按小时</Option>
                <Option value="day">按天</Option>
              </Select>
            </Form.Item>

            <Form.Item name={['config', 'maxDataPoints']} label="最大数据点数量">
              <InputNumber
                min={100}
                max={10000}
                placeholder="默认 1000"
                style={{ width: '100%' }}
              />
            </Form.Item>
          </>
        )}

        {/* 通用配置 */}
        {cardType !== 'chart' && <Divider>通用配置</Divider>}

        <Form.Item name={['config', 'unit']} label="数据单位">
          <Input placeholder="如：°C、%、V（可选）" />
        </Form.Item>

        {/* 数值卡片专属配置 */}
        {cardType === 'statistic' && (
          <>
            <Form.Item name={['config', 'precision']} label="数值精度（小数位数）">
              <InputNumber min={0} max={5} placeholder="默认 1 位小数" style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item name={['config', 'color']} label="卡片颜色">
              <Input placeholder="如：#1890ff（可选）" />
            </Form.Item>

            <Form.Item label="阈值告警配置" style={{ marginBottom: 0 }}>
              <Form.Item
                name={['config', 'threshold', 'warning']}
                label="警告阈值"
                style={{ display: 'inline-block', width: 'calc(50% - 8px)' }}
              >
                <InputNumber placeholder="警告值" style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item
                name={['config', 'threshold', 'danger']}
                label="危险阈值"
                style={{ display: 'inline-block', width: 'calc(50% - 8px)', marginLeft: '16px' }}
              >
                <InputNumber placeholder="危险值" style={{ width: '100%' }} />
              </Form.Item>
            </Form.Item>
          </>
        )}
      </Form>
    </Modal>
  );
};

export default CardConfigModal;
