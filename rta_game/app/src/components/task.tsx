import React from 'react';
import { 
    Row, 
    Col, 
    Space,
    Divider,
    Button
} from 'antd';
import { VideojsPlayer, OpencvFlowPlayer} from './player';
import { JoystickGUI } from './annotation_gui/joystick';
import './annotation_gui/gui.css'
import MouseTracker from './annotation_gui/mouse_tracker'
import {EventBuffer} from './buffer'
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import Constants from '../constants'
import { Form } from './forms/form'

class Task extends React.Component {
    public instructions = this.props.instructions
    public submit_url = this.props.submit_url

    constructor(props: any) {
        super(props);
    }
}

function getFullscreen(element) {
    if (element.requestFullscreen) {
        element.requestFullscreen();
    } else if (element.mozRequestFullScreen) {
        element.mozRequestFullScreen();
    } else if (element.webkitRequestFullscreen) {
        element.webkitRequestFullscreen();
    } else if (element.msRequestFullscreen) {
        element.msRequestFullscreen();
    }
}

function closeFullscreen() {
    if (document.exitFullscreen) {
        document.exitFullscreen();
    } else if (document.mozCancelFullScreen) { /* Firefox */
        document.mozCancelFullScreen();
    } else if (document.webkitExitFullscreen) { /* Chrome, Safari and Opera */
        document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) { /* IE/Edge */
        document.msExitFullscreen();
    }
} 

class SegmentAnnotationTask extends Task {

    private player = React.createRef()

    componentDidMount() {
    }

    handleSubmit() {
        this.props.on_submit()
    }

    render() {
        const videoJsOptions = {
            autoplay: true,
            controls: true,
            fluid: true,
            aspectRatio: '16:9',
            sources: [{
                src: this.props.media.url,
                type: 'video/mp4'
            }]
        }
        return <div style={{overflow: 'hidden'}}><Row gutter={16}>
            <Col span={16}>
                <VideojsPlayer {...videoJsOptions}></VideojsPlayer>
            </Col>
            <Col span={8}>
                <Form {...this.props.form} on_submit={this.handleSubmit.bind(this)}></Form>
            </Col>
        </Row>
        <Row gutter={16}>
                <pre>
                {JSON.stringify(this.props.form, null, 2)}
                </pre>
        </Row>
        </div>
    }
}

class KeypointAnnotationTask extends Task {
    private state = {
        'paused': true,
        'mouse_xy': {t: 'm', x: 0, y:0}, // mouse position
        'url': this.props.url
    }
    private player = React.createRef()
    private tracker= React.createRef()
    private buffer = new EventBuffer(
        200,
        this.props.url + '/chunk',
        this.handle_chunk_error.bind(this)
    )
    private on_keydown: object;

    componentDidMount() {
        // key bindings
        this.on_keydown = (function (e) {
            switch (e.key) {
                case '1':
                case '2':
                case '3':
                case '4':
                case '5':
                case '6':
                    this.player.current.playbackRate(1/parseFloat(e.key))
                    break
                case ' ':
                    this.toggle_play_pause()
                    break
                case 'x': // => go back 2s
                    var t1 = Math.max(0, this.player.current.currentTime() - 2)
                    this.player.current.currentTime(t1)
                    // this.player.current.play()
                    break
                case 'f':
                    console.log('fullscreen')
                    getFullscreen(this.tracker.current.getContainer())
                    break
                case 'z': // => slow down
                    let t2 = Math.max(0, this.player.current.currentTime() - 10)
                    this.player.current.currentTime(t2)
                    // this.player.current.play()
                    break
                default:
                    break
            }
        }).bind(this)

        document.addEventListener("keydown", this.on_keydown, false);
    }

    componentWillUnmount() {
        document.removeEventListener("keydown", this.on_keydown, false);
    }

    data(data: any) {
        this.setState({'mouse_xy': data})
        this.buffer.data(
            this.player.current.currentTime(),
            data
        )
    }

    handle_chunk_error() {
        console.log('error submitting buffer!')
    }

    toggle_play_pause() {
        if(this.state.paused) {
            this.tracker.current.start()
            this.player.current.play()
            this.setState({paused: false})
        } else {
            this.tracker.current.stop()
            this.player.current.pause()
            this.setState({ paused: true })
        }
    }

    handleSubmit() {

    }

    render() {
        const playerOptions = {
            muted: true,
            autoplay: false,
            controls: false,
            fluid: true,
            aspectRatio: '16:9',
            video: {
                src: this.props.media.url,
                res: this.props.media.res,
                type: 'video/mp4'
            },
            flow: {
                src: this.props.media.flow_url,
                res: this.props.media.flow_res,
                type: 'video/mp4'
            }
        };
        return <div style={{ overflow: 'hidden' }}><Row gutter={16}>
            <Col span={16}>
                <MouseTracker on_data={this.data.bind(this)} ref={this.tracker}>
                    <OpencvFlowPlayer
                        {...playerOptions}
                        mouse_xy={this.state.mouse_xy}
                        ref={this.player}>
                    </OpencvFlowPlayer>
                </MouseTracker>
            </Col>
            <Col span={8}>
                <Button type="primary" onClick={this.handleSubmit.bind(this)}></Button>
            </Col>
        </Row>
            <Row gutter={16}>
                
            </Row>
        </div>
    }
}

class ActionAnnotationTask extends Task {
    state = {
        url: this.props.url
    }

    componentDidMount() {
        
    }

    render() {
        return <h1>Continuous annotation</h1>
    }
}

export { SegmentAnnotationTask, KeypointAnnotationTask, ActionAnnotationTask }