import * as React from 'react'
import {
    HashRouter
} from 'react-router-dom'
import {TaskSpec} from './tasks/task'
import AvailableTasks from './tasks'
import classNames from 'classnames'
import './css/docs.css'
import { Button } from 'antd'
import $ from 'jquery'
import { HITSpec } from './hit'
import Annotation from './annotation'
import KeyboardManagerContext from './input/keyboard_manager'

const getTaskClass = (type: string) => {
    if (type in AvailableTasks) {
        const taskClass = AvailableTasks[type]
        return taskClass
    } else {
        return null
    }
}

// removes relative links in Markdown
// used to clean github docs for storybook
const updateMarkdownLinks = (doc: string) => {
    const html = $($.parseHTML('<div>'+doc+'</div>'))
    html.find('a')
    .filter(function(){
        const pattern = /^((http|https|ftp):\/\/)/
        const href = $(this).attr("href")
        return !pattern.test(href)
    })
    .each(function() {
        $(this).attr('href', null)
        $(this).css({
            'pointer-events': 'none',
            cursor: 'default',
            'text-decoration': 'none',
            'color': 'black'
        })
    })
    return html.html()
}

interface Props {
    task: TaskSpec
}

interface State {
    error: boolean,
    task: TaskSpec,
    currKey: number
}

class TaskVisualizer extends React.Component<Props, State> {

    state: State = {
        error: false,
        task: null,
        currKey: 0
    }

    originalTask: TaskSpec = null
    taskSpecElem = React.createRef<HTMLPreElement>()

    constructor(props: Props) {
         super(props)
         this.state = {
             ...this.state,
             task: this.props.task,
         }
        this.originalTask = this.props.task
    }

    componentDidMount() {
        this.taskSpecElem.current.textContent = JSON.stringify(this.props.task, null, 2)
    }

    handleData = data => {

    }

    handleEnd = data => {

    }

    handleUpdate = () => {
        try {
            const json = JSON.parse(this.taskSpecElem.current.textContent)
            this.setState({
                error: false,
                task: json,
                currKey: this.state.currKey + 1
            })
        } catch (err) {
            this.setState({
                error: true,
            })
        }
    }

    handleChange = () => {
        try {
            const json = JSON.parse(this.taskSpecElem.current.textContent)
            this.setState({
                error: false,
                task: json
            })
        } catch (err) {
            this.setState({
                error: true,
            })
        }
    }

    render() {
        const taskClass = getTaskClass(this.props.task.type)

        const task = React.createElement(taskClass, {
            // Annotation task props
            buffer: this.handleData,
            onEnd: this.handleEnd,
            setInstructionsFn: ()=>{},

            // Replayable task props
            ...this.state.task})

        return <>
            <KeyboardManagerContext>{task}</KeyboardManagerContext>
            <div>
                <pre 
                    className={classNames('docs-task-pg',{'docs-task-pg-err': this.state.error})}
                    ref={this.taskSpecElem}
                    contentEditable="true"
                    onKeyUp={this.handleChange}>
                </pre >
            </div >
            <Button onClick={this.handleUpdate}>Update</Button>
        </>
    }
}

interface HITVisualizerProps {
    hit: HITSpec,
    previewMode: boolean
}

interface HITVisualizerState {
}

class HITVisualizer extends React.Component<HITVisualizerProps, HITVisualizerState> {

    state: HITVisualizerState = {
    }

    constructor(props: HITVisualizerProps) {
        super(props)
    }

    render() {

        // add id to each task
        const hitProps = JSON.parse(JSON.stringify(this.props.hit))
        hitProps.tasks = hitProps.tasks.map((task, idx)=>{
            task.id = idx
            return task
        })

        const content = <Annotation
            {...hitProps}
            url={null}
            previewMode={true}
            onSubmit={() => { }} />

        return <HashRouter><div style={{minHeight: '300px', 'border': '1px solid #969696'}}>
            {content}
        </div></HashRouter>
    }
}

class CodeBlock extends React.Component {
    render() {
        return <>
            <div>
                <pre className={classNames('docs-code-block')}>
                    {JSON.stringify(this.props.code, null, 2)}
                </pre >
            </div >
        </>
    }
}

export { 
    TaskVisualizer,
    HITVisualizer,
    CodeBlock,
    updateMarkdownLinks}