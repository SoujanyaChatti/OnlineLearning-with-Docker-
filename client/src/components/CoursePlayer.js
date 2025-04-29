import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL } from './config'; // Import the config

const CoursePlayer = ({ courseId }) => {
  const [contents, setContents] = useState([]);
  useEffect(() => {
    const token = localStorage.getItem('token');
    axios.get(`${API_URL}/api/courses/${courseId}/modules`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        if (res.data.length > 0) {
          return axios.get(`${API_URL}/api/courses/modules/${res.data[0].id}/content`, {
            headers: { Authorization: `Bearer ${token}` }
          });
        }
      })
      .then(res => setContents(res?.data || []))
      .catch(err => console.error('Content fetch error:', err));
  }, [courseId]);
  const updateProgress = (contentId, moduleId) => {
    const token = localStorage.getItem('token');
    axios.post(`${API_URL}/api/courses/enrollments/1/progress`, {
      moduleId,
      contentId
    }, { headers: { Authorization: `Bearer ${token}` } })
      .then(response => console.log('Progress updated:', response.data))
      .catch(err => console.error('Progress update error:', err));
  };
  return (
    <div>
      {contents.length > 0 ? (
        contents.map(content => (
          <div key={content.id}>
            <h3>{content.type}: {content.url}</h3>
            <p>Duration: {content.duration}</p>
            <button onClick={() => updateProgress(content.id, content.module_id)}>Mark as Completed</button>
          </div>
        ))
      ) : <p>Loading...</p>}
    </div>
  );
};

export default CoursePlayer;
