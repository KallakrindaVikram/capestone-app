import React, { useState, useEffect, useContext } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import Context from '../../Context';
import Loading from '../Loading';

const CourseDetail = () => {
  const context = useContext(Context.Context);
  const [course, setCourseDetail] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionErrors, setActionErrors] = useState([]);
  const authUser = context.authenticatedUser;
  const email = authUser ? authUser.emailAddress : null;
  const password = authUser ? authUser.password : null;

  const { id } = useParams();
  let navigate = useNavigate();

  useEffect(() => {
    // Fetch a course from the database. Credentials let owners view their own archived courses.
    let isCurrent = true;
    const credentials = email ? { username: email, password } : null;
    setIsLoading(true);
    context.data.getCourse(id, credentials)
      .then(response => {
        if (!isCurrent) return;
        if (response && response.id) {
          setCourseDetail(response);
        } else {
          // Missing (or someone else's archived) course: direct to Not Found
          navigate('/notfound', { replace: true });
        }
      })
      .catch((error) => {
        console.error('Error fetching and parsing course', error);
        if (isCurrent) navigate('/error', { replace: true });
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });
    return () => { isCurrent = false; };
  }, [id, email, password, navigate, context.data]);

  const isOwner = !!(authUser && course && course.User && authUser.id === course.User.id);

  const handleDelete = (event) => {
    event.preventDefault();
    context.data.deleteCourse(id, authUser.emailAddress, authUser.password)
      .then((response) => {
        // If course deletion is successful, then there should be no response returned
        if (response.length) {
          navigate('/error');
        } else {
          navigate('/');
        }
      })
      .catch((error) => {
        console.error(error);
        navigate('/error');
      });
  }

  const handleArchiveToggle = (event) => {
    event.preventDefault();
    const archive = !course.archived;
    const request = archive
      ? context.data.archiveCourse(id, authUser.emailAddress, authUser.password)
      : context.data.unarchiveCourse(id, authUser.emailAddress, authUser.password);
    request
      .then((errors) => {
        if (errors.length) {
          setActionErrors(errors);
        } else {
          setActionErrors([]);
          setCourseDetail({ ...course, archived: archive });
        }
      })
      .catch((error) => {
        console.error(error);
        navigate('/error');
      });
  }

  if (isLoading || !course) {
    return <Loading />;
  }

  return (
    <div>
      <div className="actions--bar">
        <div className="wrap">
          {isOwner ? <Link to={`/courses/${id}/update`} className="button">Update Course</Link> : null}
          {isOwner ?
            <button className="button" onClick={handleArchiveToggle}>
              {course.archived ? 'Unarchive Course' : 'Archive Course'}
            </button>
            : null
          }
          {isOwner ? <button className="button" onClick={handleDelete}>Delete Course</button> : null}
          <Link to='/' className="button button-secondary">Return to List</Link>
        </div>
      </div>
      <div className="wrap">
        {actionErrors.length ?
          <div className="validation--errors" role="alert">
            <h3>Unable to update the course</h3>
            <ul>
              {actionErrors.map((error, i) => <li key={i}>{error}</li>)}
            </ul>
          </div>
          : null
        }
        {course.archived ?
          <p className="course--archived-notice" role="status">
            <span className="course--badge">Archived</span> This course is hidden from the catalog. Only you can see it.
          </p>
          : null
        }
        <h2>Course Detail</h2>
        <div className="main--flex">
          <div>
            <h3 className="course--detail--title">Course</h3>
            <h4 className="course--name">{course.title}</h4>
            {course.User
              ? (<p>By {course.User.firstName} {course.User.lastName}</p>)
              : null
            }
            <ReactMarkdown>{course.description}</ReactMarkdown>
          </div>
          <div>
            <h3 className="course--detail--title">Estimated Time</h3>
            <p>{course.estimatedTime}</p>

            <h3 className="course--detail--title">Materials Needed</h3>
            <ul className="course--detail--list">
              <ReactMarkdown>{course.materialsNeeded}</ReactMarkdown>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CourseDetail;
