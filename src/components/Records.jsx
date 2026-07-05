import React, { useEffect, useState, useRef } from 'react';
import { db } from '../config/firebase';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { transcriptToText } from '../services/transcriptService';
import { CreateMLCEngine, MLCEngine } from "@mlc-ai/web-llm";

export default function Records() {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generatingId, setGeneratingId] = useState(null);
  const [engineState, setEngineState] = useState({ text: '', progress: 0, estimatedTime: '' });
  const engineRef = useRef(null);

  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, 'transcripts'),
      where('participantIds', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Sort locally to avoid needing a Firestore composite index
      data.sort((a, b) => {
        const timeA = a.createdAt?.toMillis() || 0;
        const timeB = b.createdAt?.toMillis() || 0;
        return timeB - timeA;
      });
      
      setRecords(data);
      setLoading(false);
    }, (err) => {
      console.error('Failed to fetch records', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleGenerateSummary = async (record) => {
    if (generatingId) return; // Prevent multiple clicks
    
    const existingContent = record.summaryContent || record.readmeContent;
    if (existingContent) {
      const finalContent = existingContent;
      const blob = new Blob([finalContent], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateObj = record.createdAt && typeof record.createdAt.toDate === 'function' ? record.createdAt.toDate() : new Date();
      const dateStr = dateObj.toISOString().split('T')[0];
      a.download = `Meeting-Report-${record.channelName}-${dateStr}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return;
    }

    setGeneratingId(record.id);
    
    try {
      const modelId = "SmolLM2-135M-Instruct-q0f16-MLC";
      
      if (!engineRef.current) {
        setEngineState({ text: 'Downloading model (this may take a minute)...', progress: 0, estimatedTime: 'Est. 1-3 mins (depending on internet)' });
        
        const engine = new MLCEngine();
        engine.setInitProgressCallback((progress) => {
          setEngineState({ 
            progress: Math.round(progress.progress * 100), 
            text: progress.text,
            estimatedTime: progress.progress === 1 ? 'Est. 10-30 seconds' : 'Est. 1-3 mins (depending on internet)'
          });
        });
        
        await engine.reload(modelId);
        engineRef.current = engine;
      }

      setEngineState({ text: 'Generating Report...', progress: 100, estimatedTime: 'Est. 10-30 seconds' });
      
      const transcript = transcriptToText(record.lines);
      const prompt = `Please rewrite the following meeting transcript into a clear, professional report. Do not add any extra conversational filler, just provide the structured report directly.\n\nTranscript:\n${transcript}`;

      const reply = await engineRef.current.chat.completions.create({
        model: modelId,
        messages: [{ role: "user", content: prompt }]
      });

      const summaryText = reply.choices[0].message.content;
      
      // Save it back to Firestore so we don't have to generate it again
      await updateDoc(doc(db, 'transcripts', record.id), {
        summaryContent: summaryText
      });

      const finalContent = summaryText;

      // Download the README
      const blob = new Blob([finalContent], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateObj = record.createdAt && typeof record.createdAt.toDate === 'function' ? record.createdAt.toDate() : new Date();
      const dateStr = dateObj.toISOString().split('T')[0];
      a.download = `Meeting-Report-${record.channelName}-${dateStr}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert('Failed to generate summary');
    } finally {
      setGeneratingId(null);
      setEngineState({ text: '', progress: 0, estimatedTime: '' });
    }
  };

  if (loading) {
    return <div className="records-loading">Loading your meeting history...</div>;
  }

  return (
    <div className="records-screen">
      <div className="records-header">
        <h1>Meeting Records</h1>
        <p>Generate and download structured reports from your past meeting transcripts.</p>
      </div>

      {records.length === 0 ? (
        <div className="empty-state">
          <svg width="48" height="48" fill="var(--text-dim)" viewBox="0 0 256 256"><path d="M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40Zm0,160H40V56H216V200ZM176,88a8,8,0,0,1-8,8H88a8,8,0,0,1,0-16h80A8,8,0,0,1,176,88Zm0,48a8,8,0,0,1-8,8H88a8,8,0,0,1,0-16h80A8,8,0,0,1,176,136Zm0,48a8,8,0,0,1-8,8H88a8,8,0,0,1,0-16h80A8,8,0,0,1,176,184Z"></path></svg>
          <h3>No records found</h3>
          <p>You haven't saved any meeting transcripts yet.</p>
        </div>
      ) : (
        <div className="records-table-wrapper">
          <table className="records-table">
            <thead>
              <tr>
                <th>Meeting ID</th>
                <th>Date</th>
                <th>Lines</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.map(record => (
                <tr key={record.id}>
                  <td className="record-channel">{record.channelName}</td>
                  <td className="record-date">
                    {record.createdAt?.toDate().toLocaleString(undefined, {
                      dateStyle: 'medium',
                      timeStyle: 'short'
                    })}
                  </td>
                  <td className="record-lines">{record.lines?.length || 0} items</td>
                  <td>
                    {generatingId === record.id ? (
                      <div className="generating-status" style={{ minWidth: '160px' }}>
                        <div className="progress-track" style={{ marginBottom: '4px' }}>
                           <div className="progress-fill" style={{ width: `${engineState.progress}%` }}></div>
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--text)' }}>{engineState.text}</span>
                        {engineState.estimatedTime && (
                           <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{engineState.estimatedTime}</span>
                        )}
                      </div>
                    ) : (
                      <button 
                        className="download-btn" 
                        onClick={() => handleGenerateSummary(record)} 
                        disabled={generatingId !== null}
                      >
                        {(record.summaryContent || record.readmeContent) ? 'Download Report' : 'Generate Report'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
