import React, { useState } from 'react';
import { DollarSign, AlertCircle } from 'lucide-react';

const LabourManagementTab = ({ workspaceDetail, currentUser, setWorkspaceDetail }) => {
  const [paymentForm, setPaymentForm] = useState({ labourId: '', amount: '', type: 'Payment' });

  const isContractor = currentUser?.role === 'Contractor' || workspaceDetail.contractor?._id === currentUser?._id;
  const isClient = currentUser?.role === 'Client' || workspaceDetail.client?._id === currentUser?._id;
  const isLabour = currentUser?.role === 'Labour';

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!isContractor) return;
    if (!paymentForm.labourId || !paymentForm.amount) return alert('Please fill required fields');

    try {
      const res = await fetch(`https://allver.onrender.com/api/project-workspaces/${workspaceDetail._id}/labour/payment`, {
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
    const totalPayments = workspaceDetail.labourManagement?.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#0f172a' }}>Labour Financial Overview</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
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
          Labour payments and advances are managed by the contractor.
        </div>
      </div>
    );
  }

  // LABOUR VIEW
  if (isLabour) {
    const myPayments = workspaceDetail.labourManagement?.payments?.filter(p => p.labourId === currentUser._id) || [];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#0f172a' }}>My Payments</h3>

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
