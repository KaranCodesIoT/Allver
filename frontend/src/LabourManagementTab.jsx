import React, { useState } from 'react';
import { Users, UserCheck, Calendar, DollarSign, Save, UserX, AlertCircle } from 'lucide-react';

const LabourManagementTab = ({ workspaceDetail, currentUser, setWorkspaceDetail }) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Attendance Form State
  const [attendanceForm, setAttendanceForm] = useState({});
  const [paymentForm, setPaymentForm] = useState({ labourId: '', amount: '', type: 'Payment' });

  const isContractor = currentUser?.role === 'Contractor' || workspaceDetail.contractor?._id === currentUser?._id;
  const isClient = currentUser?.role === 'Client' || workspaceDetail.client?._id === currentUser?._id;
  const isLabour = currentUser?.role === 'Labour';

  // Find attendance for selected date
  const selectedDateRecord = workspaceDetail.labourManagement?.attendance?.find(a => a.date === selectedDate);
  const attendanceRecords = selectedDateRecord?.records || [];

  const handleAttendanceChange = (labourId, field, value) => {
    setAttendanceForm(prev => ({
      ...prev,
      [labourId]: {
        ...prev[labourId],
        [field]: value
      }
    }));
  };

  const handleSaveAttendance = async () => {
    if (!isContractor) return;
    
    // Prepare records array
    const recordsToSave = workspaceDetail.labourTeam.map(l => {
      const existing = attendanceRecords.find(r => r.labourId === l._id);
      const formVal = attendanceForm[l._id];
      return {
        labourId: l._id,
        status: formVal?.status || existing?.status || 'Present',
        hours: formVal?.hours !== undefined ? formVal.hours : (existing?.hours || 8)
      };
    });

    try {
      const res = await fetch(`http://localhost:5000/api/project-workspaces/${workspaceDetail._id}/labour/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          records: recordsToSave,
          senderId: currentUser._id
        })
      });
      if (res.ok) {
        const data = await res.json();
        setWorkspaceDetail(data.workspace);
        alert('Attendance saved successfully');
      } else {
        alert('Failed to save attendance');
      }
    } catch (err) {
      console.error(err);
      alert('Error saving attendance');
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!isContractor) return;
    if (!paymentForm.labourId || !paymentForm.amount) return alert('Please fill required fields');

    try {
      const res = await fetch(`http://localhost:5000/api/project-workspaces/${workspaceDetail._id}/labour/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          labourId: paymentForm.labourId,
          amount: Number(paymentForm.amount),
          type: paymentForm.type,
          senderId: currentUser._id
        })
      });
      if (res.ok) {
        const data = await res.json();
        setWorkspaceDetail(data.workspace);
        setPaymentForm({ labourId: '', amount: '', type: 'Payment' });
        alert('Payment recorded successfully');
      } else {
        alert('Failed to record payment');
      }
    } catch (err) {
      console.error(err);
      alert('Error recording payment');
    }
  };

  // CLIENT VIEW
  if (isClient) {
    const today = new Date().toISOString().split('T')[0];
    const todayRecord = workspaceDetail.labourManagement?.attendance?.find(a => a.date === today);
    const todayPresent = todayRecord ? todayRecord.records.filter(r => r.status === 'Present' || r.status === 'Half Day').length : 0;
    
    const totalPayments = workspaceDetail.labourManagement?.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#0f172a' }}>Labour Reports Overview</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div style={{ background: 'white', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: '#dbeafe', padding: '0.75rem', borderRadius: '0.5rem', color: '#2563eb' }}>
              <Users size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>Today's Workforce</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0f172a' }}>{todayPresent}</div>
            </div>
          </div>
          <div style={{ background: 'white', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: '#dcfce7', padding: '0.75rem', borderRadius: '0.5rem', color: '#16a34a' }}>
              <DollarSign size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>Total Labour Cost</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0f172a' }}>₹ {totalPayments.toLocaleString('en-IN')}</div>
            </div>
          </div>
        </div>
        <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '0.5rem', border: '1px dashed #cbd5e1', color: '#64748b', fontSize: '0.85rem', textAlign: 'center' }}>
          Detailed attendance and payments are managed by the contractor.
        </div>
      </div>
    );
  }

  // LABOUR VIEW
  if (isLabour) {
    const myAttendance = workspaceDetail.labourManagement?.attendance?.map(a => {
      const rec = a.records.find(r => r.labourId === currentUser._id);
      return { date: a.date, ...rec };
    }).filter(a => a.status) || [];

    const myPayments = workspaceDetail.labourManagement?.payments?.filter(p => p.labourId === currentUser._id) || [];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#0f172a' }}>My Attendance & Payments</h3>
        
        <div>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#334155', marginBottom: '0.5rem' }}>Recent Attendance</h4>
          {myAttendance.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: '#64748b' }}>No attendance records found.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {myAttendance.sort((a, b) => new Date(b.date) - new Date(a.date)).map((rec, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'white', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#0f172a' }}>{rec.date}</div>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: rec.status === 'Absent' ? '#ef4444' : '#10b981', fontWeight: 'bold' }}>{rec.status}</span>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{rec.hours} hrs</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#334155', marginBottom: '0.5rem' }}>Payments & Advances</h4>
          {myPayments.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: '#64748b' }}>No payment records found.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {myPayments.sort((a, b) => new Date(b.date) - new Date(a.date)).map((pay, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'white', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#0f172a' }}>{pay.type}</div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{new Date(pay.date).toLocaleDateString()}</div>
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#0f766e' }}>₹ {pay.amount.toLocaleString('en-IN')}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // CONTRACTOR VIEW
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Attendance Section */}
      <div style={{ background: 'white', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 'bold', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={18} color="#3b82f6" /> Daily Attendance
          </h3>
          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{ padding: '0.35rem 0.5rem', border: '1px solid #cbd5e1', borderRadius: '0.375rem', fontSize: '0.85rem' }}
          />
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', color: '#475569' }}>
                <th style={{ padding: '0.75rem', borderBottom: '1px solid #e2e8f0' }}>Labour Name</th>
                <th style={{ padding: '0.75rem', borderBottom: '1px solid #e2e8f0' }}>Status</th>
                <th style={{ padding: '0.75rem', borderBottom: '1px solid #e2e8f0', width: '80px' }}>Hours</th>
              </tr>
            </thead>
            <tbody>
              {workspaceDetail.labourTeam?.length === 0 ? (
                <tr>
                  <td colSpan="3" style={{ padding: '1rem', textAlign: 'center', color: '#64748b' }}>No labours assigned to this project yet.</td>
                </tr>
              ) : (
                workspaceDetail.labourTeam?.map(l => {
                  const existing = attendanceRecords.find(r => r.labourId === l._id);
                  const formVal = attendanceForm[l._id];
                  const currentStatus = formVal?.status || existing?.status || 'Present';
                  const currentHours = formVal?.hours !== undefined ? formVal.hours : (existing?.hours || 8);

                  return (
                    <tr key={l._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.75rem', fontWeight: '600', color: '#1e293b' }}>{l.fullName}</td>
                      <td style={{ padding: '0.75rem' }}>
                        <select 
                          value={currentStatus}
                          onChange={(e) => handleAttendanceChange(l._id, 'status', e.target.value)}
                          style={{ padding: '0.25rem 0.5rem', borderRadius: '0.25rem', border: '1px solid #cbd5e1', background: currentStatus === 'Absent' ? '#fef2f2' : currentStatus === 'Half Day' ? '#fffbeb' : '#f0fdf4', color: currentStatus === 'Absent' ? '#ef4444' : currentStatus === 'Half Day' ? '#f59e0b' : '#10b981', fontWeight: 'bold' }}
                        >
                          <option value="Present">Present</option>
                          <option value="Half Day">Half Day</option>
                          <option value="Absent">Absent</option>
                        </select>
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <input 
                          type="number" 
                          min="0" max="24"
                          value={currentHours}
                          onChange={(e) => handleAttendanceChange(l._id, 'hours', e.target.value)}
                          style={{ width: '60px', padding: '0.25rem', border: '1px solid #cbd5e1', borderRadius: '0.25rem' }}
                          disabled={currentStatus === 'Absent'}
                        />
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        
        {workspaceDetail.labourTeam?.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button 
              onClick={handleSaveAttendance}
              style={{ padding: '0.5rem 1rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.375rem', fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
            >
              <Save size={16} /> Save Attendance
            </button>
          </div>
        )}
      </div>

      {/* Payments Section */}
      <div style={{ background: 'white', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 'bold', color: '#0f172a', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <DollarSign size={18} color="#10b981" /> Record Payment / Advance
        </h3>
        
        <form onSubmit={handleRecordPayment} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '150px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#475569' }}>Select Labour</label>
            <select 
              required
              value={paymentForm.labourId}
              onChange={e => setPaymentForm({...paymentForm, labourId: e.target.value})}
              style={{ padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '0.375rem', fontSize: '0.85rem' }}
            >
              <option value="">-- Select --</option>
              {workspaceDetail.labourTeam?.map(l => (
                <option key={l._id} value={l._id}>{l.fullName}</option>
              ))}
            </select>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '150px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#475569' }}>Type</label>
            <select 
              value={paymentForm.type}
              onChange={e => setPaymentForm({...paymentForm, type: e.target.value})}
              style={{ padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '0.375rem', fontSize: '0.85rem' }}
            >
              <option value="Payment">Payment</option>
              <option value="Advance">Advance</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '150px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#475569' }}>Amount (₹)</label>
            <input 
              type="number" 
              required
              min="1"
              value={paymentForm.amount}
              onChange={e => setPaymentForm({...paymentForm, amount: e.target.value})}
              placeholder="e.g. 5000"
              style={{ padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '0.375rem', fontSize: '0.85rem' }}
            />
          </div>

          <button 
            type="submit"
            style={{ padding: '0.5rem 1.25rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '0.375rem', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', height: '37px' }}
          >
            Add Record
          </button>
        </form>

        {/* Payment History snippet */}
        <div style={{ marginTop: '1.5rem' }}>
          <h4 style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.25rem' }}>Recent Records</h4>
          {workspaceDetail.labourManagement?.payments?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {[...workspaceDetail.labourManagement.payments].reverse().slice(0, 5).map((pay, idx) => {
                const labourName = workspaceDetail.labourTeam?.find(l => l._id === pay.labourId)?.fullName || 'Unknown';
                return (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: '#f8fafc', borderRadius: '0.25rem', fontSize: '0.8rem' }}>
                    <div><span style={{ fontWeight: '600' }}>{labourName}</span> <span style={{ color: '#64748b' }}>({pay.type})</span></div>
                    <div style={{ fontWeight: 'bold', color: '#0f766e' }}>₹ {pay.amount.toLocaleString('en-IN')}</div>
                  </div>
                )
              })}
            </div>
          ) : (
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>No payments recorded yet.</span>
          )}
        </div>
      </div>

    </div>
  );
};

export default LabourManagementTab;
