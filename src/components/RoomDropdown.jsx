import React from 'react';

function RoomDropdown({ label, value, onChange, options, excludeId }) {
  return (
    <label>
      {label}:&nbsp;
      <select value={value} onChange={e => onChange(e.target.value)}>
        <option value="">Select room</option>
        {options
          .filter(room => room.id !== excludeId)
          .map(room => (
            <option key={room.id} value={room.id}>{room.name || room.id}</option>
          ))}
      </select>
    </label>
  );
}

export default React.memo(RoomDropdown);
