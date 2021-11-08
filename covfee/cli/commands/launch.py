""" Launch commands

These commands launch or build covfee and are supported for the typical use case.
"""
import os
import sys
from colorama import init as colorama_init, Fore
import click

from flask import current_app as app
from flask.cli import FlaskGroup, pass_script_info

from covfee.server.start import create_app
from ...covfee_folder import CovfeeFolder, ProjectExistsException
from halo.halo import Halo
from covfee.shared.validator.validation_errors import ValidationError
from covfee.shared.schemata import Schemata
from covfee.cli.utils import NPMPackage
from covfee import _make as covfee_make, start_deepstream
from covfee.server.rtstore import rtstore

colorama_init()


@click.group(name='covfee')
def covfee_cli():
    pass

def start_covfee(socketio, app, mode='local', host='localhost'):
    if app.config['SSL_ENABLED']:
        ssl_options = {
            
            'keyfile': app.config['SSL_KEY_FILE'],
            'certfile': app.config['SSL_CERT_FILE']
        }
    else:
        ssl_options = {}

    if app.config['RTSTORE_ENABLED']:
        # run the realtime store service
        rtstore.run()

    if mode == 'local':
        socketio.run(app, host=host, port=5000 **ssl_options)
    elif mode == 'dev':
        socketio.run(app, host=host, port=5000, debug=True, **ssl_options)
    elif mode == 'deploy':
        socketio.run(app, host=host, **ssl_options)
    else:
        raise f'unrecognized mode {mode}'

@covfee_cli.command()
@click.option("--host", default='localhost', help="Specify the IP address to serve webpack dev server. Use for testing in a local network.")
def webpack(host):
    """
    Launches a webpack instance for use in dev mode
    """
    _, app = create_app('dev')

    with app.app_context():
        covfee_folder = CovfeeFolder(os.getcwd())
        if not covfee_folder.is_project():
            return print(Fore.RED+'Working directory is not a valid covfee project folder. '
                                'Did you run covfee-maker in the current folder?')

        covfee_folder.launch_webpack(host=host)

@covfee_cli.command()
def build():
    """
    Builds the covfee bundle into the project folder
    """
    _, app = create_app('dev')

    with app.app_context():
        covfee_folder = CovfeeFolder(os.getcwd())
        if not covfee_folder.is_project():
            raise Exception(
                'Working directory is not a valid covfee project folder.')

        covfee_folder.build()

@covfee_cli.command(name="start-deepstream")
def launch_deepstream():
    """
    Starts the daemon in charge of updating the true store (state).
    Required for shared tasks.
    """
    start_deepstream()


@covfee_cli.command()
@click.option("--dev", is_flag=True, help="Run covfee in dev mode")
@click.option("--deploy", is_flag=True, help="Run covfee in deployment mode")
@click.option('--no-browser', is_flag=True, help='Disables launching of the web browser.')
def start(dev, deploy, no_browser):
    """
    Starts covfee in local mode by default. Use --deploy or --dev to start deployment (public) or development servers.
    """
    assert not (dev and deploy), '--dev and --deploy are mutually exclusive'
    mode = 'local'
    if dev: mode = 'dev'
    if deploy: mode = 'deploy'
    unsafe_mode_on = (mode in ['local', 'dev'])

    socketio, app = create_app(mode)  

    with app.app_context():
        covfee_folder = CovfeeFolder(os.getcwd())
        if not covfee_folder.is_project():
            return print(Fore.RED+'Working directory is not a valid covfee project folder. Did you run'
                                ' covfee maker in the current folder?')

        if not no_browser:
            covfee_folder.launch_in_browser(unsafe_mode_on)

        # covfee_folder.launch_prod(unsafe, launch_browser=not no_browser)
        app.config['UNSAFE_MODE_ON'] = unsafe_mode_on
        start_covfee(socketio, app, mode)


@covfee_cli.command(name="open")
def open_covfee():
    """
    Opens covfee (admin panel) in a browser window
    """
    _, app = create_app('dev')

    with app.app_context():
        covfee_folder = CovfeeFolder(os.getcwd())
        if not covfee_folder.is_project():
            raise Exception('Working directory is not a valid covfee project folder.')
        covfee_folder.launch_in_browser()


def install_npm_packages_if_not_installed():
    cli_path = app.config['COVFEE_CLI_PATH']
    npm_package = NPMPackage(cli_path)
    if not npm_package.is_installed():
        npm_package.install()

    client_path = app.config['COVFEE_CLIENT_PATH']
    npm_package = NPMPackage(client_path)
    if not npm_package.is_installed():
        npm_package.install()


@covfee_cli.command()
@click.option("--force", is_flag=True, help="Specify to overwrite existing databases.")
@click.option("--unsafe", is_flag=True, help="Disables authentication for the covfee instance.")
@click.option("--rms", is_flag=True, help="Re-makes the schemata for validation.")
@click.option("--no-launch", is_flag=True, help="Do not launch covfee, only make the DB")
@click.option("--no-browser", is_flag=True, help="Do not launch in the browser")
@click.argument("file_or_folder")
def make(force, unsafe, rms, no_browser, no_launch, file_or_folder):
    socketio, app = create_app('local')

    with app.app_context():
        install_npm_packages_if_not_installed()

        try:
            covfee_make(file_or_folder, force=force, rms=rms, stdout_enabled=True)
        except FileNotFoundError:
            pass
        except ValidationError as err:
            return err.print_friendly()
        except ProjectExistsException as err:
            return print(' Add --force option to overwrite.')
        except Exception as err:
            return print(err)

        if no_launch: 
            return

        if not no_browser:
            project_folder = CovfeeFolder(os.getcwd())
            project_folder.launch_in_browser(unsafe)

        app.config['UNSAFE_MODE_ON'] = unsafe
        start_covfee(socketio, app, 'local')

@covfee_cli.command()
def mkuser():
    """
    Creates an admin in the database.
    """
    _, app = create_app('dev')

    with app.app_context():
        project_folder = CovfeeFolder(os.getcwd())
        if not project_folder.is_project():
            project_folder.init()

        username = input('Please enter username: ')
        password = input('Please enter password: ')
        project_folder.mkuser(username, password)
