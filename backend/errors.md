python app.py                                            ──(Sat,Feb14)─┘
/Users/markpotter/zjobd/backend/newvenv/lib/python3.14/site-packages/watchdog/observers/__init__.py:68: UserWarning: Failed to import fsevents. Fall back to kqueue
  warnings.warn("Failed to import fsevents. Fall back to kqueue", stacklevel=1)
 * Serving Flask app 'app'
 * Debug mode: on
INFO:werkzeug:WARNING: This is a development server. Do not use it in a production deployment. Use a production WSGI server instead.
 * Running on all addresses (0.0.0.0)
 * Running on http://127.0.0.1:5001
 * Running on http://10.0.0.141:5001
INFO:werkzeug:Press CTRL+C to quit
INFO:werkzeug: * Restarting with watchdog (kqueue)
/Users/markpotter/zjobd/backend/newvenv/lib/python3.14/site-packages/watchdog/observers/__init__.py:68: UserWarning: Failed to import fsevents. Fall back to kqueue
  warnings.warn("Failed to import fsevents. Fall back to kqueue", stacklevel=1)
2026-02-14 14:00:29,760 - INFO     - Verifying database schema before startup...
2026-02-14 14:00:29,790 - INFO     - Ensuring base tables exist...
2026-02-14 14:00:29,826 - INFO     - Base tables verification complete.
2026-02-14 14:00:29,826 - INFO     - Database schema verified successfully.
2026-02-14 14:00:29,827 - INFO     - Starting Flask web server...
2026-02-14 14:00:29,828 - INFO     - WATCHDOG: Starting file watcher on directory: /Users/markpotter/zjobd/logs
2026-02-14 14:00:29,886 - WARNING  -  * Debugger is active!
2026-02-14 14:00:29,943 - INFO     -  * Debugger PIN: 119-177-869
Traceback (most recent call last):
  File "/Users/markpotter/zjobd/backend/app.py", line 180, in <module>
  File "/Users/markpotter/zjobd/backend/newvenv/lib/python3.14/site-packages/flask/app.py", line 662, in run
  File "/Users/markpotter/zjobd/backend/newvenv/lib/python3.14/site-packages/werkzeug/serving.py", line 1093, in run_simple
  File "/Users/markpotter/zjobd/backend/newvenv/lib/python3.14/site-packages/werkzeug/serving.py", line 930, in make_server
  File "/Users/markpotter/zjobd/backend/newvenv/lib/python3.14/site-packages/werkzeug/serving.py", line 738, in __init__
  File "/Users/markpotter/zjobd/backend/newvenv/lib/python3.14/site-packages/werkzeug/serving.py", line 674, in get_sockaddr
  File "/usr/local/Cellar/python@3.14/3.14.3_1/Frameworks/Python.framework/Versions/3.14/lib/python3.14/socket.py", line 983, in getaddrinfo
  File "/usr/local/Cellar/python@3.14/3.14.3_1/Frameworks/Python.framework/Versions/3.14/lib/python3.14/encodings/__init__.py", line 99, in search_function
  File "<frozen importlib._bootstrap>", line 1371, in _find_and_load
  File "<frozen importlib._bootstrap>", line 1342, in _find_and_load_unlocked
  File "<frozen importlib._bootstrap>", line 938, in _load_unlocked
  File "<frozen importlib._bootstrap_external>", line 755, in exec_module
  File "<frozen importlib._bootstrap_external>", line 892, in get_code
  File "<frozen importlib._bootstrap_external>", line 950, in get_data
OSError: [Errno 24] Too many open files: '/usr/local/Cellar/python@3.14/3.14.3_1/Frameworks/Python.framework/Versions/3.14/lib/python3.14/encodings/idna.py'
Traceback (most recent call last):
  File "/usr/local/Cellar/python@3.14/3.14.3_1/Frameworks/Python.framework/Versions/3.14/lib/python3.14/multiprocessing/util.py", line 371, in _run_finalizers
  File "/usr/local/Cellar/python@3.14/3.14.3_1/Frameworks/Python.framework/Versions/3.14/lib/python3.14/multiprocessing/util.py", line 295, in __call__
  File "/usr/local/Cellar/python@3.14/3.14.3_1/Frameworks/Python.framework/Versions/3.14/lib/python3.14/multiprocessing/util.py", line 147, in _remove_temp_dir
  File "/usr/local/Cellar/python@3.14/3.14.3_1/Frameworks/Python.framework/Versions/3.14/lib/python3.14/shutil.py", line 852, in rmtree
  File "/usr/local/Cellar/python@3.14/3.14.3_1/Frameworks/Python.framework/Versions/3.14/lib/python3.14/shutil.py", line 721, in _rmtree_safe_fd
  File "/usr/local/Cellar/python@3.14/3.14.3_1/Frameworks/Python.framework/Versions/3.14/lib/python3.14/shutil.py", line 802, in _rmtree_safe_fd_step
  File "/usr/local/Cellar/python@3.14/3.14.3_1/Frameworks/Python.framework/Versions/3.14/lib/python3.14/shutil.py", line 765, in _rmtree_safe_fd_step
OSError: [Errno 24] Too many open files: '/var/folders/0m/8p_14qtd2852f13yyvys45bm0000gn/T/pymp-669wqthj'
┌─(~/zjobd/backend)[newvenv]─────────────────────────────────────────────────────(markpotter@darealpro-359:s000)─┐
└─(14:01:04 on migration/gpx-schema ✹ ✭)──> python app.py                                      1 ↵ ──(Sat,Feb14)─┘
/Users/markpotter/zjobd/backend/newvenv/lib/python3.14/site-packages/watchdog/observers/__init__.py:68: UserWarning: Failed to import fsevents. Fall back to kqueue
  warnings.warn("Failed to import fsevents. Fall back to kqueue", stacklevel=1)
 * Serving Flask app 'app'
 * Debug mode: on
INFO:werkzeug:WARNING: This is a development server. Do not use it in a production deployment. Use a production WSGI server instead.
 * Running on all addresses (0.0.0.0)
 * Running on http://127.0.0.1:5001
 * Running on http://10.0.0.141:5001
INFO:werkzeug:Press CTRL+C to quit
INFO:werkzeug: * Restarting with watchdog (kqueue)
/Users/markpotter/zjobd/backend/newvenv/lib/python3.14/site-packages/watchdog/observers/__init__.py:68: UserWarning: Failed to import fsevents. Fall back to kqueue
  warnings.warn("Failed to import fsevents. Fall back to kqueue", stacklevel=1)
2026-02-14 14:01:05,238 - INFO     - Verifying database schema before startup...
2026-02-14 14:01:05,267 - INFO     - Ensuring base tables exist...
2026-02-14 14:01:05,279 - INFO     - Base tables verification complete.
2026-02-14 14:01:05,279 - INFO     - Database schema verified successfully.
2026-02-14 14:01:05,280 - INFO     - Starting Flask web server...
2026-02-14 14:01:05,280 - INFO     - WATCHDOG: Starting file watcher on directory: /Users/markpotter/zjobd/logs
2026-02-14 14:01:05,333 - WARNING  -  * Debugger is active!
2026-02-14 14:01:05,378 - INFO     -  * Debugger PIN: 119-177-869
2026-02-14 14:01:05,432 - INFO     - WATCHDOG: File watcher started successfully.
Exception in thread Thread-3:
Traceback (most recent call last):
  File "/usr/local/Cellar/python@3.14/3.14.3_1/Frameworks/Python.framework/Versions/3.14/lib/python3.14/threading.py", line 1082, in _bootstrap_inner
  File "/Users/markpotter/zjobd/backend/newvenv/lib/python3.14/site-packages/watchdog/observers/api.py", line 158, in run
  File "/Users/markpotter/zjobd/backend/newvenv/lib/python3.14/site-packages/watchdog/observers/kqueue.py", line 621, in queue_events
  File "/Users/markpotter/zjobd/backend/newvenv/lib/python3.14/site-packages/watchdog/utils/dirsnapshot.py", line 313, in __init__
  File "/Users/markpotter/zjobd/backend/newvenv/lib/python3.14/site-packages/watchdog/utils/dirsnapshot.py", line 320, in walk
OSError: [Errno 24] Too many open files: '/Users/markpotter/zjobd/logs'
Exception in thread Thread-3:
Traceback (most recent call last):
  File "/usr/local/Cellar/python@3.14/3.14.3_1/Frameworks/Python.framework/Versions/3.14/lib/python3.14/threading.py", line 1082, in _bootstrap_inner
  File "/Users/markpotter/zjobd/backend/newvenv/lib/python3.14/site-packages/watchdog/observers/api.py", line 158, in run
  File "/Users/markpotter/zjobd/backend/newvenv/lib/python3.14/site-packages/watchdog/observers/kqueue.py", line 621, in queue_events
  File "/Users/markpotter/zjobd/backend/newvenv/lib/python3.14/site-packages/watchdog/utils/dirsnapshot.py", line 313, in __init__
  File "/Users/markpotter/zjobd/backend/newvenv/lib/python3.14/site-packages/watchdog/utils/dirsnapshot.py", line 320, in walk
OSError: [Errno 24] Too many open files: '/Users/markpotter/zjobd/logs'
Traceback (most recent call last):
  File "/Users/markpotter/zjobd/backend/app.py", line 180, in <module>
    app.run(host='0.0.0.0', port=5001, debug=True)
    ~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/Users/markpotter/zjobd/backend/newvenv/lib/python3.14/site-packages/flask/app.py", line 662, in run
    run_simple(t.cast(str, host), port, self, **options)
    ~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/Users/markpotter/zjobd/backend/newvenv/lib/python3.14/site-packages/werkzeug/serving.py", line 1115, in run_simple
    run_with_reloader(
    ~~~~~~~~~~~~~~~~~^
        srv.serve_forever,
        ^^^^^^^^^^^^^^^^^^
    ...<3 lines>...
        reloader_type=reloader_type,
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    )
    ^
  File "/Users/markpotter/zjobd/backend/newvenv/lib/python3.14/site-packages/werkzeug/_reloader.py", line 461, in run_with_reloader
    reloader.run()
    ~~~~~~~~~~~~^^
  File "/Users/markpotter/zjobd/backend/newvenv/lib/python3.14/site-packages/werkzeug/_reloader.py", line 376, in run
    self.run_step()
    ~~~~~~~~~~~~~^^
  File "/Users/markpotter/zjobd/backend/newvenv/lib/python3.14/site-packages/werkzeug/_reloader.py", line 383, in run_step
    for path in _find_watchdog_paths(self.extra_files, self.exclude_patterns):
                ~~~~~~~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/Users/markpotter/zjobd/backend/newvenv/lib/python3.14/site-packages/werkzeug/_reloader.py", line 129, in _find_watchdog_paths
    name = os.path.abspath(name)
  File "<frozen posixpath>", line 381, in abspath
OSError: [Errno 24] Too many open files
Traceback (most recent call last):
  File "/usr/local/Cellar/python@3.14/3.14.3_1/Frameworks/Python.framework/Versions/3.14/lib/python3.14/multiprocessing/util.py", line 371, in _run_finalizers
    finalizer()
    ~~~~~~~~~^^
  File "/usr/local/Cellar/python@3.14/3.14.3_1/Frameworks/Python.framework/Versions/3.14/lib/python3.14/multiprocessing/util.py", line 295, in __call__
    res = self._callback(*self._args, **self._kwargs)
  File "/usr/local/Cellar/python@3.14/3.14.3_1/Frameworks/Python.framework/Versions/3.14/lib/python3.14/multiprocessing/util.py", line 147, in _remove_temp_dir
    rmtree(tempdir)
    ~~~~~~^^^^^^^^^
  File "/usr/local/Cellar/python@3.14/3.14.3_1/Frameworks/Python.framework/Versions/3.14/lib/python3.14/shutil.py", line 852, in rmtree
    _rmtree_impl(path, dir_fd, onexc)
    ~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^
  File "/usr/local/Cellar/python@3.14/3.14.3_1/Frameworks/Python.framework/Versions/3.14/lib/python3.14/shutil.py", line 721, in _rmtree_safe_fd
    _rmtree_safe_fd_step(stack, onexc)
    ~~~~~~~~~~~~~~~~~~~~^^^^^^^^^^^^^^
  File "/usr/local/Cellar/python@3.14/3.14.3_1/Frameworks/Python.framework/Versions/3.14/lib/python3.14/shutil.py", line 802, in _rmtree_safe_fd_step
    onexc(func, path, err)
    ~~~~~^^^^^^^^^^^^^^^^^
  File "/usr/local/Cellar/python@3.14/3.14.3_1/Frameworks/Python.framework/Versions/3.14/lib/python3.14/shutil.py", line 777, in _rmtree_safe_fd_step
    with os.scandir(topfd) as scandir_it:
         ~~~~~~~~~~^^^^^^^
OSError: [Errno 24] Too many open files: '/var/folders/0m/8p_14qtd2852f13yyvys45bm0000gn/T/pymp-rpx7u5wr'
┌─(~/zjobd/backend)[newvenv]─────────────────────────────────────────────────────(markpotter@darealpro-359:s000)─┐
└─(14:01:06 on migration/gpx-schema ✹ ✭)──>                                                    1 ↵ ──(Sat,Feb14)─┘
┌─(~/zjobd/backend)[newvenv]─────────────────────────────────────────────────────(markpotter@darealpro-359:s000)─┐
└─(14:02:01 on migration/gpx-schema ✹ ✭)──> ulimit -n                                          1 ↵ ──(Sat,Feb14)─┘
256
┌─(~/zjobd/backend)[newvenv]─────────────────────────────────────────────────────(markpotter@darealpro-359:s000)─┐
└─(14:05:04 on migration/gpx-schema ✹ ✭)──> ulimit -n 65536                                        ──(Sat,Feb14)─┘
┌─(~/zjobd/backend)[newvenv]─────────────────────────────────────────────────────(markpotter@darealpro-359:s000)─┐
└─(14:05:24 on migration/gpx-schema ✹ ✭)──> python app.py                                          ──(Sat,Feb14)─┘
/Users/markpotter/zjobd/backend/newvenv/lib/python3.14/site-packages/watchdog/observers/__init__.py:68: UserWarning: Failed to import fsevents. Fall back to kqueue
  warnings.warn("Failed to import fsevents. Fall back to kqueue", stacklevel=1)
 * Serving Flask app 'app'
 * Debug mode: on
INFO:werkzeug:WARNING: This is a development server. Do not use it in a production deployment. Use a production WSGI server instead.
 * Running on all addresses (0.0.0.0)
 * Running on http://127.0.0.1:5001
 * Running on http://10.0.0.141:5001
INFO:werkzeug:Press CTRL+C to quit
INFO:werkzeug: * Restarting with watchdog (kqueue)
/Users/markpotter/zjobd/backend/newvenv/lib/python3.14/site-packages/watchdog/observers/__init__.py:68: UserWarning: Failed to import fsevents. Fall back to kqueue
  warnings.warn("Failed to import fsevents. Fall back to kqueue", stacklevel=1)
2026-02-14 14:05:25,984 - INFO     - Verifying database schema before startup...
2026-02-14 14:05:26,013 - INFO     - Ensuring base tables exist...
2026-02-14 14:05:26,023 - INFO     - Base tables verification complete.
2026-02-14 14:05:26,023 - INFO     - Database schema verified successfully.
2026-02-14 14:05:26,024 - INFO     - Starting Flask web server...
2026-02-14 14:05:26,024 - INFO     - WATCHDOG: Starting file watcher on directory: /Users/markpotter/zjobd/logs
2026-02-14 14:05:26,078 - WARNING  -  * Debugger is active!
2026-02-14 14:05:26,124 - INFO     -  * Debugger PIN: 119-177-869
2026-02-14 14:05:26,263 - INFO     - WATCHDOG: File watcher started successfully.
2026-02-14 14:07:58,285 - CRITICAL - DATABASE CONNECTION FAILED: 2005 (HY000): Unknown MySQL server host 'localhost' (8)
2026-02-14 14:07:58,296 - INFO     - 127.0.0.1 - - [14/Feb/2026 14:07:58] "GET /api/logs HTTP/1.1" 500 -
2026-02-14 14:07:58,311 - ERROR    - Error on request:
Traceback (most recent call last):
  File "/Users/markpotter/zjobd/backend/newvenv/lib/python3.14/site-packages/mysql/connector/connection_cext.py", line 354, in _open_connection
_mysql_connector.MySQLInterfaceError: Unknown MySQL server host 'localhost' (8)

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/Users/markpotter/zjobd/backend/newvenv/lib/python3.14/site-packages/werkzeug/debug/__init__.py", line 347, in debug_application
  File "/Users/markpotter/zjobd/backend/newvenv/lib/python3.14/site-packages/flask/app.py", line 1536, in __call__
  File "/Users/markpotter/zjobd/backend/newvenv/lib/python3.14/site-packages/flask/app.py", line 1514, in wsgi_app
  File "/Users/markpotter/zjobd/backend/newvenv/lib/python3.14/site-packages/flask_cors/extension.py", line 176, in wrapped_function
  File "/Users/markpotter/zjobd/backend/newvenv/lib/python3.14/site-packages/flask/app.py", line 1511, in wsgi_app
  File "/Users/markpotter/zjobd/backend/newvenv/lib/python3.14/site-packages/flask/app.py", line 919, in full_dispatch_request
  File "/Users/markpotter/zjobd/backend/newvenv/lib/python3.14/site-packages/flask_cors/extension.py", line 176, in wrapped_function
  File "/Users/markpotter/zjobd/backend/newvenv/lib/python3.14/site-packages/flask/app.py", line 917, in full_dispatch_request
  File "/Users/markpotter/zjobd/backend/newvenv/lib/python3.14/site-packages/flask/app.py", line 902, in dispatch_request
  File "/Users/markpotter/zjobd/backend/app.py", line 61, in get_logs
  File "/Users/markpotter/zjobd/backend/log2db/db_manager.py", line 22, in __init__
  File "/Users/markpotter/zjobd/backend/newvenv/lib/python3.14/site-packages/mysql/connector/pooling.py", line 322, in connect
  File "/Users/markpotter/zjobd/backend/newvenv/lib/python3.14/site-packages/mysql/connector/connection_cext.py", line 142, in __init__
  File "/Users/markpotter/zjobd/backend/newvenv/lib/python3.14/site-packages/mysql/connector/abstracts.py", line 1604, in connect
  File "/Users/markpotter/zjobd/backend/newvenv/lib/python3.14/site-packages/mysql/connector/connection_cext.py", line 360, in _open_connection
mysql.connector.errors.DatabaseError: 2005 (HY000): Unknown MySQL server host 'localhost' (8)

During handling of the above exception, another exception occurred:

Traceback (most recent call last):
  File "/Users/markpotter/zjobd/backend/newvenv/lib/python3.14/site-packages/werkzeug/serving.py", line 333, in execute
  File "/Users/markpotter/zjobd/backend/newvenv/lib/python3.14/site-packages/werkzeug/debug/__init__.py", line 362, in debug_application
  File "/Users/markpotter/zjobd/backend/newvenv/lib/python3.14/site-packages/werkzeug/debug/tbtools.py", line 345, in render_debugger_html
  File "/Users/markpotter/zjobd/backend/newvenv/lib/python3.14/site-packages/werkzeug/debug/tbtools.py", line 276, in render_traceback_html
  File "/Users/markpotter/zjobd/backend/newvenv/lib/python3.14/site-packages/werkzeug/utils.py", line 100, in __get__
  File "/Users/markpotter/zjobd/backend/newvenv/lib/python3.14/site-packages/werkzeug/debug/tbtools.py", line 384, in is_library
  File "/usr/local/Cellar/python@3.14/3.14.3_1/Frameworks/Python.framework/Versions/3.14/lib/python3.14/sysconfig/__init__.py", line 506, in get_paths
  File "/usr/local/Cellar/python@3.14/3.14.3_1/Frameworks/Python.framework/Versions/3.14/lib/python3.14/sysconfig/__init__.py", line 285, in _expand_vars
  File "/usr/local/Cellar/python@3.14/3.14.3_1/Frameworks/Python.framework/Versions/3.14/lib/python3.14/sysconfig/__init__.py", line 633, in get_config_vars
  File "/usr/local/Cellar/python@3.14/3.14.3_1/Frameworks/Python.framework/Versions/3.14/lib/python3.14/sysconfig/__init__.py", line 534, in _init_config_vars
  File "/usr/local/Cellar/python@3.14/3.14.3_1/Frameworks/Python.framework/Versions/3.14/lib/python3.14/sysconfig/__init__.py", line 402, in _init_posix
  File "/usr/local/Cellar/python@3.14/3.14.3_1/Frameworks/Python.framework/Versions/3.14/lib/python3.14/sysconfig/__init__.py", line 382, in _get_sysconfigdata
  File "/usr/local/Cellar/python@3.14/3.14.3_1/Frameworks/Python.framework/Versions/3.14/lib/python3.14/importlib/__init__.py", line 88, in import_module
  File "<frozen importlib._bootstrap>", line 1398, in _gcd_import
  File "<frozen importlib._bootstrap>", line 1371, in _find_and_load
  File "<frozen importlib._bootstrap>", line 1342, in _find_and_load_unlocked
  File "<frozen importlib._bootstrap>", line 938, in _load_unlocked
  File "<frozen importlib._bootstrap_external>", line 755, in exec_module
  File "<frozen importlib._bootstrap_external>", line 892, in get_code
  File "<frozen importlib._bootstrap_external>", line 950, in get_data
OSError: [Errno 24] Too many open files: '/usr/local/Cellar/python@3.14/3.14.3_1/Frameworks/Python.framework/Versions/3.14/lib/python3.14/_sysconfigdata__darwin_darwin.py'

During handling of the above exception, another exception occurred:

Traceback (most recent call last):
  File "/Users/markpotter/zjobd/backend/newvenv/lib/python3.14/site-packages/werkzeug/serving.py", line 370, in run_wsgi
  File "/Users/markpotter/zjobd/backend/newvenv/lib/python3.14/site-packages/werkzeug/serving.py", line 346, in execute
  File "/usr/local/Cellar/python@3.14/3.14.3_1/Frameworks/Python.framework/Versions/3.14/lib/python3.14/selectors.py", line 493, in __init__
OSError: [Errno 24] Too many open files
^C
^C%
┌─(~/zjobd/backend)[newvenv]─────────────────────────────────────────────────────(markpotter@darealpro-359:s000)─┐
└─(14:09:26 on migration/gpx-schema ✹ ✭)──> python app.py                                          ──(Sat,Feb14)─┘
/Users/markpotter/zjobd/backend/newvenv/lib/python3.14/site-packages/watchdog/observers/__init__.py:68: UserWarning: Failed to import fsevents. Fall back to kqueue
  warnings.warn("Failed to import fsevents. Fall back to kqueue", stacklevel=1)
 * Serving Flask app 'app'
 * Debug mode: on
INFO:werkzeug:WARNING: This is a development server. Do not use it in a production deployment. Use a production WSGI server instead.
 * Running on all addresses (0.0.0.0)
 * Running on http://127.0.0.1:5001
 * Running on http://10.0.0.141:5001
INFO:werkzeug:Press CTRL+C to quit
INFO:werkzeug: * Restarting with watchdog (kqueue)
/Users/markpotter/zjobd/backend/newvenv/lib/python3.14/site-packages/watchdog/observers/__init__.py:68: UserWarning: Failed to import fsevents. Fall back to kqueue
  warnings.warn("Failed to import fsevents. Fall back to kqueue", stacklevel=1)
2026-02-14 14:09:27,733 - INFO     - Verifying database schema before startup...
2026-02-14 14:09:27,763 - INFO     - Ensuring base tables exist...
2026-02-14 14:09:27,772 - INFO     - Base tables verification complete.
2026-02-14 14:09:27,772 - INFO     - Database schema verified successfully.
2026-02-14 14:09:27,773 - INFO     - Starting Flask web server...
2026-02-14 14:09:27,773 - INFO     - WATCHDOG: Starting file watcher on directory: /Users/markpotter/zjobd/logs
2026-02-14 14:09:27,833 - WARNING  -  * Debugger is active!
2026-02-14 14:09:27,893 - INFO     -  * Debugger PIN: 119-177-869
2026-02-14 14:09:28,022 - INFO     - WATCHDOG: File watcher started successfully.
Exception in thread Thread-8:
Traceback (most recent call last):
  File "/usr/local/Cellar/python@3.14/3.14.3_1/Frameworks/Python.framework/Versions/3.14/lib/python3.14/threading.py", line 1082, in _bootstrap_inner
    self._context.run(self.run)
    ~~~~~~~~~~~~~~~~~^^^^^^^^^^
  File "/Users/markpotter/zjobd/backend/newvenv/lib/python3.14/site-packages/watchdog/observers/api.py", line 158, in run
    self.queue_events(self.timeout)
    ~~~~~~~~~~~~~~~~~^^^^^^^^^^^^^^
  File "/Users/markpotter/zjobd/backend/newvenv/lib/python3.14/site-packages/watchdog/observers/kqueue.py", line 621, in queue_events
    new_snapshot = DirectorySnapshot(self.watch.path, recursive=self.watch.is_recursive)
  File "/Users/markpotter/zjobd/backend/newvenv/lib/python3.14/site-packages/watchdog/utils/dirsnapshot.py", line 313, in __init__
    for p, st in self.walk(path):
                 ~~~~~~~~~^^^^^^
  File "/Users/markpotter/zjobd/backend/newvenv/lib/python3.14/site-packages/watchdog/utils/dirsnapshot.py", line 342, in walk
    yield from self.walk(path)
  File "/Users/markpotter/zjobd/backend/newvenv/lib/python3.14/site-packages/watchdog/utils/dirsnapshot.py", line 342, in walk
    yield from self.walk(path)
  File "/Users/markpotter/zjobd/backend/newvenv/lib/python3.14/site-packages/watchdog/utils/dirsnapshot.py", line 320, in walk
    paths = [os.path.join(root, entry.name) for entry in self.listdir(root)]
                                                         ~~~~~~~~~~~~^^^^^^
OSError: [Errno 24] Too many open files: '/usr/local/Cellar/python@3.14/3.14.3_1/Frameworks/Python.framework/Versions/3.14/lib/python3.14/string/__pycache__'
Exception in thread Thread-6:
Traceback (most recent call last):
  File "/usr/local/Cellar/python@3.14/3.14.3_1/Frameworks/Python.framework/Versions/3.14/lib/python3.14/threading.py", line 1082, in _bootstrap_inner
    self._context.run(self.run)
    ~~~~~~~~~~~~~~~~~^^^^^^^^^^
  File "/Users/markpotter/zjobd/backend/newvenv/lib/python3.14/site-packages/watchdog/observers/api.py", line 158, in run
    self.queue_events(self.timeout)
    ~~~~~~~~~~~~~~~~~^^^^^^^^^^^^^^
  File "/Users/markpotter/zjobd/backend/newvenv/lib/python3.14/site-packages/watchdog/observers/kqueue.py", line 621, in queue_events
    new_snapshot = DirectorySnapshot(self.watch.path, recursive=self.watch.is_recursive)
  File "/Users/markpotter/zjobd/backend/newvenv/lib/python3.14/site-packages/watchdog/utils/dirsnapshot.py", line 313, in __init__
    for p, st in self.walk(path):
                 ~~~~~~~~~^^^^^^
  File "/Users/markpotter/zjobd/backend/newvenv/lib/python3.14/site-packages/watchdog/utils/dirsnapshot.py", line 320, in walk
    paths = [os.path.join(root, entry.name) for entry in self.listdir(root)]
                                                         ~~~~~~~~~~~~^^^^^^
OSError: [Errno 24] Too many open files: '/usr/local/opt/python-tk@3.14/libexec'
Traceback (most recent call last):
  File "/Users/markpotter/zjobd/backend/app.py", line 180, in <module>
    app.run(host='0.0.0.0', port=5001, debug=True)
    ~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/Users/markpotter/zjobd/backend/newvenv/lib/python3.14/site-packages/flask/app.py", line 662, in run
    run_simple(t.cast(str, host), port, self, **options)
    ~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/Users/markpotter/zjobd/backend/newvenv/lib/python3.14/site-packages/werkzeug/serving.py", line 1115, in run_simple
    run_with_reloader(
    ~~~~~~~~~~~~~~~~~^
        srv.serve_forever,
        ^^^^^^^^^^^^^^^^^^
    ...<3 lines>...
        reloader_type=reloader_type,
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    )
    ^
  File "/Users/markpotter/zjobd/backend/newvenv/lib/python3.14/site-packages/werkzeug/_reloader.py", line 461, in run_with_reloader
    reloader.run()
    ~~~~~~~~~~~~^^
  File "/Users/markpotter/zjobd/backend/newvenv/lib/python3.14/site-packages/werkzeug/_reloader.py", line 376, in run
    self.run_step()
    ~~~~~~~~~~~~~^^
  File "/Users/markpotter/zjobd/backend/newvenv/lib/python3.14/site-packages/werkzeug/_reloader.py", line 383, in run_step
    for path in _find_watchdog_paths(self.extra_files, self.exclude_patterns):
                ~~~~~~~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/Users/markpotter/zjobd/backend/newvenv/lib/python3.14/site-packages/werkzeug/_reloader.py", line 129, in _find_watchdog_paths
    name = os.path.abspath(name)
  File "<frozen posixpath>", line 381, in abspath
OSError: [Errno 24] Too many open files
