import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { listUsers, updateUserRole, updateUserStatus } from '../services/user.service';
import { useAuth } from '../context/AuthContext';
import styles from './UserManagementTable.module.css';

function initials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export default function UserManagementTable() {
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [roleFilter, setRoleFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const fetchUsers = (page = 1) => {
    setLoading(true);
    setError(null);
    listUsers({ page, role: roleFilter || undefined, search: search || undefined, limit: 15 })
      .then((data) => {
        setUsers(data.items);
        setPagination(data.pagination);
      })
      .catch((err) => {
        setError(err?.response?.data?.message || t('admin.updateError'));
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchUsers(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchUsers(1);
  };

  const handleRoleChange = async (userId, targetName, newRole) => {
    if (!window.confirm(t('admin.confirmRoleChange', { name: targetName, role: t(`role.${newRole}`) }))) {
      return;
    }

    setUpdatingId(userId);
    setFeedback(null);
    try {
      const updated = await updateUserRole(userId, newRole);
      setUsers((prev) => prev.map((u) => (u._id === userId ? { ...u, role: updated.role } : u)));
      setFeedback({ type: 'success', message: t('admin.updateSuccess') });
    } catch (err) {
      setFeedback({ type: 'error', message: err?.response?.data?.message || t('admin.updateError') });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleStatusToggle = async (userId, targetName, currentStatus) => {
    const nextStatus = !currentStatus;
    const actionText = nextStatus ? t('admin.activate') : t('admin.deactivate');
    if (!window.confirm(t('admin.confirmStatusChange', { name: targetName, action: actionText }))) {
      return;
    }

    setUpdatingId(userId);
    setFeedback(null);
    try {
      const updated = await updateUserStatus(userId, nextStatus);
      setUsers((prev) => prev.map((u) => (u._id === userId ? { ...u, isActive: updated.isActive } : u)));
      setFeedback({ type: 'success', message: t('admin.updateSuccess') });
    } catch (err) {
      setFeedback({ type: 'error', message: err?.response?.data?.message || t('admin.updateError') });
    } finally {
      setUpdatingId(null);
    }
  };

  const getRoleSelectStyle = (role) => {
    if (role === 'admin') return `${styles.selectRole} ${styles.selectRoleAdmin}`;
    if (role === 'moderator') return `${styles.selectRole} ${styles.selectRoleModerator}`;
    return `${styles.selectRole} ${styles.selectRoleUser}`;
  };

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <div>
          <h2 className={styles.title}>{t('admin.manageUsers')}</h2>
          <p className={styles.subTitle}>Total registrados: {pagination.total}</p>
        </div>

        {/* Filtro y Búsqueda */}
        <div className={styles.controlsGroup}>
          <form onSubmit={handleSearchSubmit} className={styles.searchForm}>
            <input
              type="text"
              placeholder={t('admin.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={styles.searchInput}
            />
            <button type="submit" className={styles.searchBtn}>
              Buscar
            </button>
          </form>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className={styles.roleSelectFilter}
          >
            <option value="">Todos los roles</option>
            <option value="user">{t('role.user')}</option>
            <option value="moderator">{t('role.moderator')}</option>
            <option value="admin">{t('role.admin')}</option>
          </select>
        </div>
      </div>

      {feedback && (
        <div className={feedback.type === 'success' ? styles.feedbackSuccess : styles.feedbackError}>
          {feedback.message}
        </div>
      )}

      {error && (
        <p className={styles.errorMessage}>{error}</p>
      )}

      {loading && (
        <p className={styles.loadingText}>{t('common.loading')}</p>
      )}

      {!loading && users.length === 0 && (
        <div className={styles.emptyState}>
          <p className={styles.emptyText}>No se encontraron usuarios.</p>
        </div>
      )}

      {!loading && users.length > 0 && (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr className={styles.tableHeaderRow}>
                <th className={styles.thCell}>Usuario</th>
                <th className={styles.thCell}>Email</th>
                <th className={styles.thCell}>Rol</th>
                <th className={styles.thCell}>Estado</th>
                <th className={styles.thCellRight}>Acciones</th>
              </tr>
            </thead>
            <tbody className={styles.tbody}>
              {users.map((u) => {
                const isSelf = currentUser?.id === u._id;
                const isBusy = updatingId === u._id;

                return (
                  <tr key={u._id} className={styles.trRow}>
                    {/* Usuario / Avatar */}
                    <td className={styles.tdCell}>
                      <div className={styles.userFlex}>
                        {u.avatarUrl ? (
                          <img
                            src={u.avatarUrl}
                            alt=""
                            className={styles.avatarImage}
                          />
                        ) : (
                          <div className={styles.avatarInitials}>
                            {initials(u.name)}
                          </div>
                        )}
                        <div>
                          <span className={styles.userName}>{u.name}</span>
                          {isSelf && (
                            <span className={styles.selfLabel}>
                              (Tú)
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td className={styles.tdCellEmail}>{u.email}</td>

                    {/* Selector de Rol */}
                    <td className={styles.tdCell}>
                      <select
                        value={u.role}
                        disabled={isSelf || isBusy}
                        onChange={(e) => handleRoleChange(u._id, u.name, e.target.value)}
                        className={getRoleSelectStyle(u.role)}
                      >
                        <option value="user">{t('role.user')}</option>
                        <option value="moderator">{t('role.moderator')}</option>
                        <option value="admin">{t('role.admin')}</option>
                      </select>
                    </td>

                    {/* Estado de Cuenta */}
                    <td className={styles.tdCell}>
                      <span
                        className={`${styles.statusTag} ${
                          u.isActive ? styles.statusActive : styles.statusInactive
                        }`}
                      >
                        {u.isActive ? t('admin.statusActive') : t('admin.statusInactive')}
                      </span>
                    </td>

                    {/* Botón de Inactivación */}
                    <td className={styles.tdCellRight}>
                      <button
                        disabled={isSelf || isBusy}
                        onClick={() => handleStatusToggle(u._id, u.name, u.isActive)}
                        className={`${styles.toggleStatusBtn} ${
                          u.isActive ? styles.toggleStatusBtnActive : styles.toggleStatusBtnInactive
                        }`}
                      >
                        {u.isActive ? t('admin.deactivate') : t('admin.activate')}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginación */}
      {pagination.totalPages > 1 && (
        <div className={styles.paginationRow}>
          <button
            disabled={pagination.page <= 1}
            onClick={() => fetchUsers(pagination.page - 1)}
            className={styles.pageBtn}
          >
            {t('incidentList.prev')}
          </button>
          <span>
            {t('incidentList.pageOf', { page: pagination.page, totalPages: pagination.totalPages })}
          </span>
          <button
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => fetchUsers(pagination.page + 1)}
            className={styles.pageBtn}
          >
            {t('incidentList.next')}
          </button>
        </div>
      )}
    </div>
  );
}
