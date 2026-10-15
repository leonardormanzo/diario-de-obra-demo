import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { WifiOff } from 'lucide-react';
import { AuthUser, Project, DailyLog, AppNotification, SiteTask, DigitalSignature } from './types';
import {
  loadProjects,
  saveProjects,
  loadDailyLogs,
  saveDailyLogs,
  saveOrUpdateLog,
  deleteLog,
  loadNotifications,
  saveNotifications,
} from './services/storageService';
import { checkDeadlinesAndNotify, countLateTasks } from './services/deadlineAlertService';
import { downloadDailyLogPdf } from './services/pdfGenerator';
import { shareDailyLogPdf } from './services/shareService';
import { downloadBackup, restoreBackup } from './services/backupService';
import {
  getSnapshot,
  queueDelete,
  requestSync,
  setDataChangedHandler,
  startCloudSync,
  stopCloudSync,
  subscribe,
  syncNow,
} from './services/cloudSync';
import { usePWAInstall } from './hooks/usePWAInstall';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { loadDraft } from './services/photoStore';

import { AppHeader } from './components/AppHeader';
import { AccountSheet } from './components/AccountSheet';
import { InteractiveDashboard } from './components/InteractiveDashboard';
import { DailyLogsList } from './components/DailyLogsList';
import { DailyLogFormModal } from './components/DailyLogFormModal';
import { AppBottomNav } from './components/AppBottomNav';
import { ObraFormModal } from './components/ObraFormModal';
import { UsersManager } from './components/UsersManager';
import { SavedRdoDraft } from './components/rdo/rdoDraft';
import { DeadlinesManager } from './components/DeadlinesManager';
import { NotificationCenter } from './components/NotificationCenter';
import { ClientRestrictedView } from './components/ClientRestrictedView';

interface AppProps {
  user: AuthUser;
  onLogout: () => void;
}

type ObraData = Pick<Project, 'name' | 'address' | 'engineerInCharge' | 'artRrt' | 'clientName' | 'progressPercent'>;

const newId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export default function App({ user, onLogout }: AppProps) {
  const isOnline = useOnlineStatus();
  const sync = useSyncExternalStore(subscribe, getSnapshot);
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();

  const isCoordinator = user.role === 'coordenador';
  const isClient = user.role === 'cliente';

  // Data (local copy; the cloud sync keeps it up to date)
  const [projects, setProjects] = useState<Project[]>([]);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');

  // Screens and dialogs
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'logs'>('dashboard');
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<DailyLog | null>(null);
  const [resumeDraft, setResumeDraft] = useState<SavedRdoDraft | null>(null);
  const [obraModal, setObraModal] = useState<{ project: Project | null; thenNewLog: boolean } | null>(null);
  const [isDeadlinesModalOpen, setIsDeadlinesModalOpen] = useState(false);
  const [isUsersOpen, setIsUsersOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isNotifDrawerOpen, setIsNotifDrawerOpen] = useState(false);
  const [pushPermissionState, setPushPermissionState] = useState<NotificationPermission>('default');

  const reloadLocalData = () => {
    setProjects(loadProjects());
    setLogs(loadDailyLogs());
    setNotifications(loadNotifications());
  };

  useEffect(() => {
    const loadedProjects = loadProjects();
    const loadedLogs = loadDailyLogs();
    setProjects(loadedProjects);
    setLogs(loadedLogs);

    if (!isClient) {
      checkDeadlinesAndNotify(loadedLogs, loadedProjects);
      // Reopen an RDO that was being filled when the page reloaded (e.g. Android closed the tab).
      loadDraft<SavedRdoDraft>().then((saved) => {
        if (!saved) return;
        setEditingLog(saved.initialLogId ? loadedLogs.find((l) => l.id === saved.initialLogId) || null : null);
        setResumeDraft(saved);
        setIsFormModalOpen(true);
      });
    }
    setNotifications(loadNotifications());

    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPushPermissionState(Notification.permission);
    }

    setDataChangedHandler(reloadLocalData);
    startCloudSync();
    return () => {
      setDataChangedHandler(null);
      stopCloudSync();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRequestPushPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const permission = await Notification.requestPermission();
      setPushPermissionState(permission);
      if (permission === 'granted') {
        new Notification('Diário de Obra', {
          body: 'Avisos ativados. Você será avisado dos prazos dos serviços.',
          icon: 'icon.svg',
        });
      }
    }
  };

  // The server already sends each person only their obras. The client also sees one obra at a time.
  const clientProject = projects.find((p) => p.id === selectedProjectId) ?? projects[0];
  const accessibleProjects = isClient ? (clientProject ? [clientProject] : []) : projects;
  const accessibleLogs = isClient ? logs.filter((l) => l.projectId === clientProject?.id) : logs;

  const nextRdoNumberFor = (projectId: string) =>
    logs.filter((l) => l.projectId === projectId).reduce((max, l) => Math.max(max, l.rdoNumber), 0) + 1;

  /* ----------------------------------- RDOs ----------------------------------- */

  const handleSaveLog = async (log: DailyLog, shouldExportPdf: boolean, _unused: boolean, shouldShare = false) => {
    let updatedLogs: DailyLog[];
    try {
      updatedLogs = saveOrUpdateLog(log);
    } catch (err) {
      console.error('Falha ao salvar o RDO no aparelho:', err);
      window.alert('Não foi possível salvar: a memória do aparelho está cheia. Apague fotos antigas.');
      return;
    }
    setLogs([...updatedLogs]);
    setIsFormModalOpen(false);
    setEditingLog(null);
    setResumeDraft(null);
    requestSync();

    const project = projects.find((p) => p.id === log.projectId);
    if (shouldExportPdf) await downloadDailyLogPdf(log, project);
    if (shouldShare) await shareDailyLogPdf(log, project);

    checkDeadlinesAndNotify(updatedLogs, projects);
    setNotifications(loadNotifications());
  };

  const handleUpdateTask = (logId: string, updatedTask: SiteTask) => {
    const log = loadDailyLogs().find((l) => l.id === logId);
    if (!log) return;

    const updatedLog: DailyLog = {
      ...log,
      tasks: (log.tasks || []).map((t) => (t.id === updatedTask.id ? updatedTask : t)),
      syncStatus: 'pending',
    };
    const newLogs = saveOrUpdateLog(updatedLog);
    setLogs([...newLogs]);
    requestSync();

    checkDeadlinesAndNotify(newLogs, projects);
    setNotifications(loadNotifications());
  };

  const handleApplySignature = (logId: string, signature: DigitalSignature) => {
    const log = loadDailyLogs().find((l) => l.id === logId);
    if (!log) return;
    const newLogs = saveOrUpdateLog({ ...log, digitalSignature: signature, status: 'aprovado', syncStatus: 'pending' });
    setLogs([...newLogs]);
    requestSync();
  };

  const handleDeleteLog = (logId: string) => {
    setLogs(deleteLog(logId));
    queueDelete('log', logId);
  };

  const handleShareLog = async (log: DailyLog) => {
    try {
      await shareDailyLogPdf(log, projects.find((p) => p.id === log.projectId));
    } catch (error) {
      console.error('Falha ao enviar o PDF:', error);
      window.alert('Não foi possível gerar o PDF deste RDO.');
    }
  };

  /* ----------------------------------- obras ---------------------------------- */

  const openNewLog = () => {
    if (projects.length === 0) {
      if (isCoordinator) setObraModal({ project: null, thenNewLog: true });
      return;
    }
    setEditingLog(null);
    setIsFormModalOpen(true);
  };

  const handleSaveObra = (data: ObraData) => {
    if (!obraModal) return;
    const { project, thenNewLog } = obraModal;
    const current = loadProjects();

    const saved: Project = project
      ? { ...project, ...data, needsSync: true }
      : {
          id: newId('obra'),
          code: `OBRA-${String(current.length + 1).padStart(2, '0')}`,
          engineerEmail: '',
          clientEmail: '',
          startDate: new Date().toISOString().split('T')[0],
          expectedEndDate: '',
          status: 'em_andamento',
          ...data,
          needsSync: true,
        };

    const next = project ? current.map((p) => (p.id === saved.id ? saved : p)) : [...current, saved];
    saveProjects(next);
    setProjects(next);

    // RDOs keep a copy of the obra name (used in the PDF): keep it in sync after a rename.
    if (project && project.name !== saved.name) {
      const now = new Date().toISOString();
      const renamed = loadDailyLogs().map((l) =>
        l.projectId === saved.id ? { ...l, projectName: saved.name, syncStatus: 'pending' as const, updatedAt: now } : l
      );
      saveDailyLogs(renamed);
      setLogs(renamed);
    }

    setObraModal(null);
    requestSync();
    if (thenNewLog) {
      setEditingLog(null);
      setIsFormModalOpen(true);
    }
  };

  const handleDeleteObra = (projectId: string) => {
    const next = loadProjects().filter((p) => p.id !== projectId);
    saveProjects(next);
    setProjects(next);
    if (selectedProjectId === projectId) setSelectedProjectId('all');
    setObraModal(null);
    queueDelete('project', projectId);
  };

  /* ---------------------------------- backup ---------------------------------- */

  const handleBackup = () => `Cópia salva: ${downloadBackup()}`;

  const handleRestore = async (file: File) => {
    const result = await restoreBackup(file);
    reloadLocalData();
    requestSync();
    if (result.addedLogs + result.addedProjects === 0) return 'Nada novo para restaurar: tudo já está neste aparelho.';
    return `Restaurado: ${result.addedProjects} obra(s) e ${result.addedLogs} RDO(s).`;
  };

  /* ----------------------------------- render --------------------------------- */

  const unreadCount = notifications.filter((n) => !n.read).length;
  const lateCount = countLateTasks(accessibleLogs, accessibleProjects);

  return (
    <div className="flex min-h-screen flex-col bg-slate-100 font-sans text-slate-900 selection:bg-amber-500 selection:text-slate-950">
      {!isOnline && (
        <div className="sticky top-0 z-40 flex items-center justify-center gap-2 bg-amber-600 px-4 py-2 text-sm font-bold text-white">
          <WifiOff className="h-5 w-5 shrink-0" /> Sem internet — fica salvo aqui e é enviado quando o sinal voltar
        </div>
      )}

      <AppHeader
        user={user}
        sync={sync}
        unreadCount={unreadCount}
        showBell={!isClient}
        onOpenAccount={() => setIsAccountOpen(true)}
        onOpenNotifications={() => setIsNotifDrawerOpen(true)}
      />

      <main className={`mx-auto w-full max-w-7xl flex-1 px-3 pt-4 ${isClient ? 'pb-8' : 'pb-28'}`}>
        {isClient ? (
          clientProject ? (
            <div className="mx-auto max-w-2xl space-y-4">
              {projects.length > 1 && (
                <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1">
                  {projects.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedProjectId(p.id)}
                      className={`shrink-0 rounded-full border-2 px-4 py-2.5 text-sm font-bold transition active:scale-95 ${
                        p.id === clientProject.id ? 'border-[#121214] bg-[#121214] text-white' : 'border-slate-200 bg-white text-slate-600'
                      }`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              )}
              <ClientRestrictedView project={clientProject} logs={accessibleLogs} clientEmail={user.email} />
            </div>
          ) : (
            <p className="py-16 text-center text-lg font-bold text-slate-500">
              Nenhuma obra liberada para você ainda. Fale com o coordenador.
            </p>
          )
        ) : (
          <>
            {currentTab === 'dashboard' && (
              <InteractiveDashboard
                projects={accessibleProjects}
                logs={accessibleLogs}
                lateCount={lateCount}
                canCreateObra={isCoordinator}
                canInstall={isInstallable && !isInstalled}
                showIosInstallHint={isIOS && !isInstalled}
                onInstall={install}
                onOpenDeadlines={() => setIsDeadlinesModalOpen(true)}
                onOpenNewLog={openNewLog}
                onNewObra={() => setObraModal({ project: null, thenNewLog: false })}
                onEditObra={(project) => setObraModal({ project, thenNewLog: false })}
                onSelectProject={(id) => {
                  setSelectedProjectId(id);
                  setCurrentTab('logs');
                }}
                onBackup={handleBackup}
                onRestore={handleRestore}
              />
            )}

            {currentTab === 'logs' && (
              <DailyLogsList
                logs={accessibleLogs}
                projects={accessibleProjects}
                selectedProjectId={selectedProjectId}
                onSelectProject={setSelectedProjectId}
                onOpenNewLog={openNewLog}
                onEditLog={(log) => {
                  setEditingLog(log);
                  setIsFormModalOpen(true);
                }}
                onShareLog={handleShareLog}
                onDeleteLog={handleDeleteLog}
                onSaveSignature={handleApplySignature}
              />
            )}
          </>
        )}
      </main>

      {!isClient && (
        <AppBottomNav
          active={currentTab}
          logsCount={accessibleLogs.length}
          lateCount={lateCount}
          showUsers={isCoordinator}
          onNavigate={(target) => {
            if (target === 'deadlines') setIsDeadlinesModalOpen(true);
            else if (target === 'users') setIsUsersOpen(true);
            else setCurrentTab(target);
          }}
        />
      )}

      {obraModal && (
        <ObraFormModal
          project={obraModal.project}
          logsCount={obraModal.project ? logs.filter((l) => l.projectId === obraModal.project!.id).length : 0}
          defaultEngineer={isCoordinator ? '' : user.name}
          canDelete={isCoordinator}
          onSave={handleSaveObra}
          onDelete={handleDeleteObra}
          onClose={() => setObraModal(null)}
        />
      )}

      {isFormModalOpen && (
        <DailyLogFormModal
          initialLog={editingLog}
          projects={accessibleProjects}
          currentUserEmail={user.email}
          nextRdoNumberFor={nextRdoNumberFor}
          resume={resumeDraft}
          onSave={handleSaveLog}
          onClose={() => {
            setIsFormModalOpen(false);
            setEditingLog(null);
            setResumeDraft(null);
          }}
        />
      )}

      {isDeadlinesModalOpen && (
        <DeadlinesManager
          logs={accessibleLogs}
          projects={accessibleProjects}
          onUpdateTask={handleUpdateTask}
          onClose={() => setIsDeadlinesModalOpen(false)}
        />
      )}

      {isUsersOpen && <UsersManager projects={projects} currentUserId={user.id} onClose={() => setIsUsersOpen(false)} />}

      {isAccountOpen && (
        <AccountSheet
          user={user}
          sync={sync}
          onSyncNow={() => void syncNow()}
          onLogout={onLogout}
          onClose={() => setIsAccountOpen(false)}
        />
      )}

      {isNotifDrawerOpen && (
        <NotificationCenter
          notifications={notifications}
          onMarkAsRead={(id) => {
            const updated = notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
            setNotifications(updated);
            saveNotifications(updated);
          }}
          onMarkAllAsRead={() => {
            const updated = notifications.map((n) => ({ ...n, read: true }));
            setNotifications(updated);
            saveNotifications(updated);
          }}
          onRequestPushPermission={handleRequestPushPermission}
          pushPermissionState={pushPermissionState}
          onClose={() => setIsNotifDrawerOpen(false)}
        />
      )}
    </div>
  );
}
