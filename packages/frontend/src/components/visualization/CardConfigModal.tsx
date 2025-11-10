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
      void loadEndpoints();

      // 如果是编辑模式，填充表单
      if (card) {
        setCardType(card.cardType);

        // 处理配置对象，转换时间范围格式
        const config =
          typeof card.config === 'string'
            ? (JSON.parse(card.config) as Record<string, unknown>)
            : (card.config as Record<string, unknown>);
        let formConfig: Record<string, unknown> = { ...config };

        // 如果是图表类型且有自定义时间范围，需要转换为 Dayjs 数组
        if (card.cardType === 'chart') {
          const timeRange = config.timeRange as
            | { type: string; custom?: { startTime: string; endTime: string } }
            | undefined;
          if (timeRange?.type === 'custom' && timeRange.custom) {
            formConfig = {
              ...config,
              timeRange: {
                type: 'custom',
                custom: [dayjs(timeRange.custom.startTime), dayjs(timeRange.custom.endTime)],
              },
            };
          }
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
          void loadDevices(card.endpointId);
        }
        if (card.endpointId && card.deviceId) {
          void loadDataKeys(card.endpointId, card.deviceId);
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
      void message.error('加载端点列表失败');
    }
  };

  /**
   * 端点选择变化时加载设备列表
   * CRITICAL: 图表类型也需要加载设备列表,因为数据源配置需要选择设备
   */
  const handleEndpointChange = (endpointId: string) => {
    // 清空设备和数据字段
    form.setFieldsValue({ deviceId: undefined, dataKey: undefined });
    setDevices([]);
    setDataKeys([]);

    // 所有卡片类型都需要加载设备列表(图表类型在数据源配置中需要)
    void loadDevices(endpointId);
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
      void message.error('加载设备列表失败');
    } finally {
      setLoadingDevices(false);
    }
  };

  /**
   * 设备选择变化时加载数据字段列表
   */
  const handleDeviceChange = (deviceId: string) => {
    // 清空数据字段
    form.setFieldsValue({ dataKey: undefined });
    setDataKeys([]);

    const endpointId = form.getFieldValue('endpointId') as string | undefined;
    if (!endpointId) {
      void message.error('请先选择端点');
      return;
    }

    void loadDataKeys(endpointId, deviceId);
  };

  /**
   * 加载数据字段列表
   */
  const loadDataKeys = async (endpointId: string, deviceId: string) => {
    try {
      const response = await getDeviceDataKeys(endpointId, deviceId);
      setDataKeys(response.dataKeys);

      if (response.dataKeys.length === 0) {
        void message.info(
          '该设备暂无数据字段，您可以手动输入字段名称，创建卡片后等待设备上报数据',
          5
        );
      }
    } catch (error) {
      console.error('Failed to load data keys:', error);
      void message.error('加载数据字段失败');
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
      const config: Record<string, unknown> = {
        unit: values.config?.unit,
        color: values.config?.color,
        precision: values.config?.precision,
        threshold: values.config?.threshold as Record<string, number> | undefined,
        refreshInterval: values.config?.refreshInterval,
      };

      // 如果是图表类型，添加图表特定配置
      if (values.cardType === 'chart') {
        config.chartType = values.config?.chartType as string | undefined;
        config.dataSources = values.config?.dataSources as unknown[] | undefined;
        config.aggregation = values.config?.aggregation as string | undefined;
        config.maxDataPoints = values.config?.maxDataPoints;

        // 处理时间范围配置（需要转换 DatePicker.RangePicker 的值）
        if (values.config?.timeRange) {
          const timeRange = values.config.timeRange as Record<string, unknown>;
          if (timeRange.type === 'custom' && timeRange.custom && Array.isArray(timeRange.custom)) {
            // DatePicker.RangePicker 返回的是 [Dayjs, Dayjs]，需要转换为字符串
            const customRange = timeRange.custom as Array<{ toISOString: () => string }>;
            config.timeRange = {
              type: 'custom',
              custom: {
                startTime: customRange[0].toISOString(),
                endTime: customRange[1].toISOString(),
              },
            };
          } else {
            config.timeRange = timeRange;
          }
        }
      }

      // 如果是仪表盘类型，添加仪表盘特定配置
      if (values.cardType === 'gauge') {
        config.gaugeConfig = values.config?.gaugeConfig as Record<string, unknown> | undefined;
      }

      // 如果是状态指示器类型，添加状态指示器特定配置
      if (values.cardType === 'status') {
        // 将 statusMap 数组转换为对象格式(Form.List 存储为数组)
        const statusMapArray = (values.config?.statusConfig?.statusMap || []) as Array<{
          value: string;
          color: string;
          text: string;
        }>;
        const statusMap: Record<string, { color: string; text: string }> = {};

        statusMapArray.forEach((item) => {
          if (item.value) {
            statusMap[item.value] = {
              color: item.color,
              text: item.text,
            };
          }
        });

        config.statusConfig = {
          statusMap,
          defaultStatus: values.config?.statusConfig?.defaultStatus as
            | Record<string, unknown>
            | undefined,
        };
      }

      // 如果是编辑模式，使用现有位置；否则使用默认位置
      const cardData: CreateCardDto = {
        ...values,
        position: card?.position || { x: 0, y: 0, w: 6, h: 4 }, // 图表卡片默认更大
        config: config,
      };

      if (card) {
        // 编辑模式
        await updateCard(card.id, cardData);
        void message.success('卡片配置已更新');
      } else {
        // 创建模式
        await createCard(cardData);
        void message.success('卡片配置已创建');
      }

      form.resetFields();
      onOk();
    } catch (error) {
      if (error instanceof Error && 'errorFields' in error) {
        // 表单验证错误，不显示消息
        return;
      }
      console.error('Failed to save card:', error);
      void message.error(card ? '更新卡片配置失败' : '创建卡片配置失败');
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
      onOk={() => void handleSubmit()}
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
            onChange={(value: string) => {
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
                  validator: async (_, dataSources: unknown[] | null | undefined) => {
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
                            onChange={(deviceId: string) => {
                              // 当选择设备时,加载该设备的数据字段列表
                              const endpointId = form.getFieldValue('endpointId') as
                                | string
                                | undefined;
                              if (endpointId && deviceId) {
                                void (async () => {
                                  try {
                                    const response = await getDeviceDataKeys(endpointId, deviceId);
                                    setDataKeys(response.dataKeys);
                                    if (response.dataKeys.length === 0) {
                                      void message.info('该设备暂无数据字段,请手动输入字段名称', 3);
                                    }
                                  } catch (error) {
                                    console.error('Failed to load data keys:', error);
                                  }
                                })();
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

        {cardType !== 'chart' && cardType !== 'status' && (
          <Form.Item name={['config', 'unit']} label="数据单位">
            <Input placeholder="如：°C、%、V（可选）" />
          </Form.Item>
        )}

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

        {/* 仪表盘专属配置 */}
        {cardType === 'gauge' && (
          <>
            <Form.Item name={['config', 'gaugeConfig', 'min']} label="最小值">
              <InputNumber placeholder="默认 0" style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item name={['config', 'gaugeConfig', 'max']} label="最大值">
              <InputNumber placeholder="默认 100" style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item name={['config', 'gaugeConfig', 'unit']} label="单位">
              <Input placeholder="如：% 或 °C（可选）" />
            </Form.Item>

            <Form.Item label="颜色区间配置" tooltip="定义不同数值区间的颜色，用于视觉警示">
              <Form.List name={['config', 'gaugeConfig', 'colorRanges']}>
                {(fields, { add, remove }) => (
                  <>
                    {fields.map((field) => (
                      <div
                        key={field.key}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr auto',
                          gap: '8px',
                          marginBottom: 8,
                          alignItems: 'start',
                        }}
                      >
                        <Form.Item
                          {...field}
                          name={[field.name, 'threshold']}
                          rules={[{ required: true, message: '请输入阈值' }]}
                          style={{ marginBottom: 0 }}
                        >
                          <InputNumber
                            placeholder="阈值比例（0-1）"
                            min={0}
                            max={1}
                            step={0.1}
                            style={{ width: '100%' }}
                          />
                        </Form.Item>

                        <Form.Item
                          {...field}
                          name={[field.name, 'color']}
                          rules={[{ required: true, message: '请输入颜色' }]}
                          style={{ marginBottom: 0 }}
                        >
                          <Input placeholder="#52c41a" />
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
                      添加颜色区间
                    </Button>
                  </>
                )}
              </Form.List>
            </Form.Item>
          </>
        )}

        {/* 状态指示器专属配置 */}
        {cardType === 'status' && (
          <>
            <Form.Item label="状态映射配置" tooltip="定义不同数值或文本对应的状态颜色和显示文本">
              <Form.List name={['config', 'statusConfig', 'statusMap']}>
                {(fields, { add, remove }) => (
                  <>
                    {fields.map((field) => (
                      <div
                        key={field.key}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr 1.5fr auto',
                          gap: '8px',
                          marginBottom: 8,
                          alignItems: 'start',
                        }}
                      >
                        <Form.Item
                          {...field}
                          name={[field.name, 'value']}
                          rules={[{ required: true, message: '请输入值' }]}
                          style={{ marginBottom: 0 }}
                        >
                          <Input placeholder="数值或文本" />
                        </Form.Item>

                        <Form.Item
                          {...field}
                          name={[field.name, 'color']}
                          rules={[{ required: true, message: '请选择颜色' }]}
                          style={{ marginBottom: 0 }}
                        >
                          <Select placeholder="状态颜色">
                            <Option value="success">成功（绿色）</Option>
                            <Option value="warning">警告（橙色）</Option>
                            <Option value="error">错误（红色）</Option>
                            <Option value="processing">处理中（蓝色）</Option>
                            <Option value="default">默认（灰色）</Option>
                          </Select>
                        </Form.Item>

                        <Form.Item
                          {...field}
                          name={[field.name, 'text']}
                          rules={[{ required: true, message: '请输入文本' }]}
                          style={{ marginBottom: 0 }}
                        >
                          <Input placeholder="显示文本" />
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
                      添加状态映射
                    </Button>
                  </>
                )}
              </Form.List>
            </Form.Item>

            <Form.Item label="默认状态配置" tooltip="当数据值未匹配到任何映射时显示的默认状态">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '8px' }}>
                <Form.Item
                  name={['config', 'statusConfig', 'defaultStatus', 'color']}
                  style={{ marginBottom: 0 }}
                >
                  <Select placeholder="默认颜色">
                    <Option value="success">成功（绿色）</Option>
                    <Option value="warning">警告（橙色）</Option>
                    <Option value="error">错误（红色）</Option>
                    <Option value="processing">处理中（蓝色）</Option>
                    <Option value="default">默认（灰色）</Option>
                  </Select>
                </Form.Item>

                <Form.Item
                  name={['config', 'statusConfig', 'defaultStatus', 'text']}
                  style={{ marginBottom: 0 }}
                >
                  <Input placeholder="默认显示文本（如：未知）" />
                </Form.Item>
              </div>
            </Form.Item>
          </>
        )}
      </Form>
    </Modal>
  );
};

export default CardConfigModal;
