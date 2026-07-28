import { useEffect, useMemo, useState } from 'react';

function formatCurrency(amount) {
  return `US$${Number(amount).toLocaleString('en-US', {
    maximumFractionDigits: 0
  })}`;
}

function getTimeLeft(deadline) {
  const total = new Date(deadline).getTime() - Date.now();

  if (total <= 0 || Number.isNaN(total)) {
    return { isOpen: false, label: 'Early bird closed' };
  }

  const days = Math.floor(total / (1000 * 60 * 60 * 24));
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((total / (1000 * 60)) % 60);

  return {
    isOpen: true,
    label: `${days}d ${hours}h ${minutes}m left`
  };
}

function getCurriculumLabel(course) {
  if (!course.durationLabel) {
    return 'View curriculum';
  }

  const normalizedDuration = course.durationLabel
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/^(\d+)\s+hours?$/, '$1-hour');

  return `View ${normalizedDuration} curriculum`;
}

export function CourseCard({ course, onRegister }) {
  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(course.earlyBirdEndsAt));

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTimeLeft(getTimeLeft(course.earlyBirdEndsAt));
    }, 60000);

    return () => window.clearInterval(timer);
  }, [course.earlyBirdEndsAt]);

  const activePrice = useMemo(() => {
    return timeLeft.isOpen ? course.earlyBirdPriceUsd : course.standardPriceUsd;
  }, [course, timeLeft.isOpen]);

  return (
    <article className="course-card">
      {course.imageUrl && (
        <figure className="course-image">
          <img src={course.imageUrl} alt={course.imageAlt || course.title} loading="lazy" />
          {course.imageCredit && <figcaption>{course.imageCredit}</figcaption>}
        </figure>
      )}

      <div className="course-label">{course.badge || 'Masterclass'}</div>

      <h3>{course.title}</h3>
      <p className="course-subtitle">{course.subtitle}</p>

      <div className="course-meta">
        <span>{course.dateLabel}</span>
        <span>{course.timeLabel}</span>
        <span>{course.durationLabel}</span>
      </div>

      <p>{course.shortDescription}</p>

      <div className="countdown-card">
        <span>Early bird deadline</span>
        <strong>{timeLeft.label}</strong>
        <small>Early bird ends 3 weeks before the course starts.</small>
      </div>

      {course.highlights?.length > 0 && (
        <ul>
          {course.highlights.map((highlight) => (
            <li key={highlight}>{highlight}</li>
          ))}
        </ul>
      )}

      {course.curriculum?.length > 0 && (
        <details className="curriculum">
          <summary>{getCurriculumLabel(course)}</summary>

          <div className="curriculum-list">
            {course.curriculum.map((item) => (
              <div key={item.title} className="curriculum-item">
                <strong>{item.title}</strong>

                {item.detail && <p>{item.detail}</p>}

                {item.lessons?.length > 0 && (
                  <ul>
                    {item.lessons.map((lesson) => (
                      <li key={lesson}>{lesson}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </details>
      )}

      <div className="price-row">
        <div>
          <span className="price-label">Standard</span>
          <strong>{formatCurrency(course.standardPriceUsd)}</strong>
        </div>

        <div className="early-price">
          <span className="price-label">Early bird</span>
          <strong>{formatCurrency(course.earlyBirdPriceUsd)}</strong>
        </div>
      </div>

      <button className="button button-primary" onClick={() => onRegister(course)}>
        Register · {formatCurrency(activePrice)}
      </button>
    </article>
  );
}