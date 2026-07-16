import { Tooltip } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';

/**
 * Label + optional info tooltip for form fields (replaces long Alert blocks).
 */
const FormLabelWithInfo = ({ label, info, required = false }) => (
  <span>
    {label}
    {required ? <span style={{ color: 'var(--ant-color-error)' }}> *</span> : null}
    {info ? (
      <>
        {' '}
        <Tooltip title={info}>
          <InfoCircleOutlined style={{ color: 'var(--ant-color-text-secondary)', cursor: 'help' }} />
        </Tooltip>
      </>
    ) : null}
  </span>
);

export default FormLabelWithInfo;
