/**
 * ControlConfigModal Component
 * 控制配置对话框，用于添加和编辑控制配置
 * Story 6.4: 设备控制和指令下发（可视化整合版）
 */

import { useEffect } from 'react';
import { Modal, Form, Input, Select, InputNumber, Switch, message } from 'antd';
import type { ControlConfig } from './ConfigurableControlItem';

const { Option } = Select;

interface ControlConfigModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (config: ControlConfig) => void;
  editingConfig?: ControlConfig | null;
}

/**
 * 控制配置对话框
 */
function ControlConfigModal({
  open,
  onClose,
  onSave,
  editingConfig,
}: ControlConfigModalProps): JSX.Element {
  const [form] = Form.useForm();

  // 编辑模式时填充表单
  useEffect(() => {
    if (open && editingConfig) {
      form.setFieldsValue(editingConfig);
    } else if (open) {
      form.resetFields();
    }
  }, [open, editingConfig, form]);

  /**
   * 表单提交处理
   */
  const handleSubmit = () => {
    void (async () => {
      try {
        const values = (await form.validateFields()) as ControlConfig;

        // 生成唯一ID（如果是新建）
        const config: ControlConfig = {
          ...values,
          id: editingConfig?.id ?? `control-${Date.now()}`,
        };

        onSave(config);
        form.resetFields();
        onClose();
        void message.success(editingConfig ? '控制配置已更新' : '控制配置已添加');
      } catch (error) {
        console.error('表单验证失败:', error);
      }
    })();
  };

  /**
   * 取消处理
   */
  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title={editingConfig ? '编辑控制配置' : '添加控制配置'}
      open={open}
      onOk={handleSubmit}
      onCancel={handleCancel}
      okText="保存"
      cancelText="取消"
      width={600}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          type: 'switch',
          icon: 'api',
          danger: false,
          min: 0,
          max: 100,
          step: 1,
        }}
      >
        <Form.Item
          name="label"
          label="控制标签"
          rules={[{ required: true, message: '请输入控制标签' }]}
        >
          <Input placeholder="例如：灯光控制" />
        </Form.Item>

        <Form.Item
          name="type"
          label="控制类型"
          rules={[{ required: true, message: '请选择控制类型' }]}
        >
          <Select placeholder="选择控制类型">
            <Option value="switch">开关量（Switch）</Option>
            <Option value="number">数字量（InputNumber）</Option>
            <Option value="slider">滑块（Slider）</Option>
            <Option value="button">按钮操作（Button）</Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="command"
          label="指令类型"
          rules={[{ required: true, message: '请输入指令类型' }]}
          tooltip="发送给设备的指令类型，例如：setLight, setTemperature"
        >
          <Input placeholder="例如：setLight" />
        </Form.Item>

        <Form.Item name="icon" label="图标" rules={[{ required: true, message: '请选择图标' }]}>
          <Select placeholder="选择图标">
            <Option value="bulb">灯泡（Bulb）</Option>
            <Option value="thunder">闪电（Thunder）</Option>
            <Option value="fire">火焰（Fire）</Option>
            <Option value="api">接口（API）</Option>
          </Select>
        </Form.Item>

        {/* 数字量和滑块类型的额外配置 */}
        <Form.Item
          noStyle
          shouldUpdate={(prevValues: { type?: string }, currentValues: { type?: string }) =>
            prevValues.type !== currentValues.type
          }
        >
          {({ getFieldValue }) => {
            const controlType = getFieldValue('type') as string;

            if (controlType === 'number' || controlType === 'slider') {
              return (
                <>
                  <Form.Item
                    name="defaultValue"
                    label="默认值"
                    rules={[{ required: true, message: '请输入默认值' }]}
                  >
                    <InputNumber placeholder="默认值" style={{ width: '100%' }} />
                  </Form.Item>

                  <Form.Item
                    name="min"
                    label="最小值"
                    rules={[{ required: true, message: '请输入最小值' }]}
                  >
                    <InputNumber placeholder="最小值" style={{ width: '100%' }} />
                  </Form.Item>

                  <Form.Item
                    name="max"
                    label="最大值"
                    rules={[{ required: true, message: '请输入最大值' }]}
                  >
                    <InputNumber placeholder="最大值" style={{ width: '100%' }} />
                  </Form.Item>

                  <Form.Item name="step" label="步长">
                    <InputNumber placeholder="步长" style={{ width: '100%' }} min={0.1} />
                  </Form.Item>

                  <Form.Item name="unit" label="单位">
                    <Input placeholder="例如：°C, %, V" />
                  </Form.Item>
                </>
              );
            }

            if (controlType === 'switch') {
              return (
                <Form.Item name="defaultValue" label="默认状态" valuePropName="checked">
                  <Switch checkedChildren="开" unCheckedChildren="关" />
                </Form.Item>
              );
            }

            if (controlType === 'button') {
              return (
                <Form.Item
                  name="danger"
                  label="危险操作"
                  valuePropName="checked"
                  tooltip="是否为危险操作（红色按钮）"
                >
                  <Switch />
                </Form.Item>
              );
            }

            return null;
          }}
        </Form.Item>
      </Form>
    </Modal>
  );
}

export default ControlConfigModal;
